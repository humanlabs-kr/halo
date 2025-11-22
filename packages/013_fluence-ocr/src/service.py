"""
Fluence OCR Service
A Flask-based OCR microservice for receipt processing using Tesseract.
"""

from flask import Flask, request, jsonify
import requests
import re
from io import BytesIO
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import pytesseract
import os
from dotenv import load_dotenv
import numpy as np

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
OCR_SERVICE_PORT = int(os.getenv("OCR_SERVICE_PORT", "5000"))
ALLOWED_IPFS_GATEWAYS = [
    "https://ipfs.io/ipfs/",
    "https://w3s.link/ipfs/",
    "https://gateway.pinata.cloud/ipfs/"
]


def convert_ipfs_url(url: str) -> str:
    """Convert ipfs:// URLs to HTTP gateway URLs."""
    if url.startswith("ipfs://"):
        cid = url.replace("ipfs://", "")
        return f"{ALLOWED_IPFS_GATEWAYS[0]}{cid}"
    return url


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess image to improve OCR quality.

    Improvements:
    - Enhance contrast
    - Sharpen image
    - Reduce noise
    - Deskew if needed
    """
    try:
        # Convert to grayscale for better OCR
        if image.mode != 'L':
            image = image.convert('L')

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)

        # Enhance sharpness
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)

        # Reduce noise using median filter
        image = image.filter(ImageFilter.MedianFilter(size=3))

        # Enhance brightness if image is too dark
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.1)

        return image
    except Exception as e:
        print(f"Warning: Image preprocessing failed: {e}. Using original image.")
        return image


def extract_receipt_fields(text: str) -> dict:
    """
    Extract common receipt fields from OCR text using regex patterns.

    Returns:
        dict: Extracted fields like total_amount, date, merchant name, etc.
    """
    fields = {}

    # Extract total/amount (handles formats like "Total: $25.50", "TOTAL 25,50", etc.)
    total_patterns = [
        r'(?:Total|TOTAL|Total Amount|TOTAL AMOUNT)\s*[:\$]?\s*([\d\.,]+)',
        r'(?:Amount Due|AMOUNT DUE|Balance|BALANCE)\s*[:\$]?\s*([\d\.,]+)',
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['total_amount'] = match.group(1)
            break

    # Extract date (basic pattern for common formats)
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # MM/DD/YYYY or DD/MM/YYYY
        r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',    # YYYY/MM/DD
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            fields['date'] = match.group(1)
            break

    # Extract store/merchant name (usually near the top)
    lines = text.split('\n')
    if lines:
        # Try to find merchant name in first few non-empty lines
        for line in lines[:5]:
            cleaned = line.strip()
            if cleaned and len(cleaned) > 5 and len(cleaned) < 100:
                # Avoid common patterns that aren't merchant names
                if not re.match(r'^\d+$', cleaned) and 'total' not in cleaned.lower():
                    fields['merchant_name'] = cleaned
                    break

    return fields


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "fluence-ocr",
        "version": "0.0.1"
    })


@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """
    Main OCR processing endpoint.

    Expected JSON body:
        {
            "imageUrl": "ipfs://QmXxxx..." or "https://..."
        }

    Returns:
        {
            "text": "full extracted text",
            "fields": {
                "total_amount": "25.50",
                "date": "11/22/2024",
                "merchant_name": "Store Name"
            },
            "success": true
        }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                "error": "Request must be JSON",
                "success": False
            }), 400

        data = request.get_json()
        image_url = data.get('imageUrl')

        if not image_url:
            return jsonify({
                "error": "Missing 'imageUrl' in request body",
                "success": False
            }), 400

        # Convert IPFS URLs to HTTP gateway URLs
        image_url = convert_ipfs_url(image_url)

        # Fetch the image
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            return jsonify({
                "error": f"Failed to fetch image: {str(e)}",
                "success": False
            }), 400

        # Load image
        try:
            image = Image.open(BytesIO(response.content))
            # Convert to RGB if necessary (handles RGBA, grayscale, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
        except Exception as e:
            return jsonify({
                "error": f"Failed to process image: {str(e)}",
                "success": False
            }), 400

        # Preprocess image for better OCR quality
        try:
            image = preprocess_image(image)
        except Exception as e:
            print(f"Preprocessing error (continuing with original): {e}")

        # Run OCR with all available languages
        try:
            # Use all installed Tesseract languages for better accuracy
            # This includes English, Spanish, Portuguese, French, German, Italian, etc.
            extracted_text = pytesseract.image_to_string(image, lang='eng+spa+fra+deu+ita+por')
        except Exception as e:
            return jsonify({
                "error": f"OCR processing failed: {str(e)}",
                "success": False
            }), 500

        # Extract structured fields
        fields = extract_receipt_fields(extracted_text)

        return jsonify({
            "text": extracted_text,
            "fields": fields,
            "success": True
        })

    except Exception as e:
        return jsonify({
            "error": f"Unexpected error: {str(e)}",
            "success": False
        }), 500


@app.route('/ocr/batch', methods=['POST'])
def ocr_batch_endpoint():
    """
    Batch OCR processing endpoint for multiple images.

    Expected JSON body:
        {
            "imageUrls": ["ipfs://QmXxxx...", "https://..."]
        }

    Returns:
        {
            "results": [
                {"imageUrl": "...", "text": "...", "fields": {...}, "success": true},
                ...
            ],
            "success": true
        }
    """
    try:
        if not request.is_json:
            return jsonify({
                "error": "Request must be JSON",
                "success": False
            }), 400

        data = request.get_json()
        image_urls = data.get('imageUrls', [])

        if not image_urls or not isinstance(image_urls, list):
            return jsonify({
                "error": "Missing or invalid 'imageUrls' list",
                "success": False
            }), 400

        results = []
        for image_url in image_urls:
            # Process each image
            converted_url = convert_ipfs_url(image_url)

            try:
                response = requests.get(converted_url, timeout=30)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content))
                if image.mode != 'RGB':
                    image = image.convert('RGB')

                # Preprocess image for better OCR quality
                image = preprocess_image(image)

                # Run OCR with all available languages
                extracted_text = pytesseract.image_to_string(image, lang='eng+spa+fra+deu+ita+por')
                fields = extract_receipt_fields(extracted_text)

                results.append({
                    "imageUrl": image_url,
                    "text": extracted_text,
                    "fields": fields,
                    "success": True
                })
            except Exception as e:
                results.append({
                    "imageUrl": image_url,
                    "error": str(e),
                    "success": False
                })

        return jsonify({
            "results": results,
            "success": True
        })

    except Exception as e:
        return jsonify({
            "error": f"Batch processing failed: {str(e)}",
            "success": False
        }), 500


if __name__ == '__main__':
    # Run Flask server
    print(f"Starting Fluence OCR Service on port {OCR_SERVICE_PORT}")
    app.run(host='0.0.0.0', port=OCR_SERVICE_PORT, debug=False)
