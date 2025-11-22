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
import base64

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


def load_image_from_source(image_url: str) -> Image.Image:
    """
    Load image from various sources: base64, IPFS URLs, or HTTP URLs.

    Returns:
        PIL.Image: Loaded image
    """
    # Handle base64 encoded images
    if image_url.startswith("data:image/"):
        try:
            # Extract base64 data from data URL
            # Format: data:image/jpeg;base64,<base64_data>
            if ",base64," in image_url:
                base64_data = image_url.split(",base64,")[1]
            else:
                base64_data = image_url.split(",")[1]

            # Decode base64
            image_bytes = base64.b64decode(base64_data)
            image = Image.open(BytesIO(image_bytes))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            return image
        except Exception as e:
            raise ValueError(f"Failed to decode base64 image: {str(e)}")

    # Handle raw base64 string (without data URL prefix)
    elif not image_url.startswith(('http', 'ipfs', 'data')):
        try:
            # Try to decode as raw base64
            image_bytes = base64.b64decode(image_url)
            image = Image.open(BytesIO(image_bytes))

            if image.mode != 'RGB':
                image = image.convert('RGB')

            return image
        except Exception as e:
            raise ValueError(f"Failed to decode raw base64 image: {str(e)}")

    # Handle IPFS and HTTP/HTTPS URLs
    else:
        # Convert IPFS URLs to HTTP gateway URLs
        image_url = convert_ipfs_url(image_url)

        # Fetch the image
        try:
            response = requests.get(image_url, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            raise ValueError(f"Failed to fetch image: {str(e)}")

        # Load image
        try:
            image = Image.open(BytesIO(response.content))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            return image
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")


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
    Extract common receipt fields from OCR text using advanced regex patterns.
    Handles multiple receipt formats, languages, and garbled text.

    Returns:
        dict: Extracted fields like total_amount, date, merchant name, etc.
    """
    fields = {}

    # ===== TOTAL AMOUNT EXTRACTION =====
    # Handles: Total, Amount Due, Subtotal, Grand Total, etc.
    # Supports: $25.50, 25,50, USD 25.50, etc.
    total_patterns = [
        # English formats
        r'(?:Grand\s+Total|GRAND\s+TOTAL|Total\s+Due|TOTAL\s+DUE)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:Total|TOTAL)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:Amount\s+Due|AMOUNT\s+DUE)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:Balance|BALANCE|Due|DUE)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        # Spanish/Portuguese formats
        r'(?:Total|TOTAL|Importe|IMPORTE)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:Pagar|PAGAR)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        # Generic: currency symbol followed by number
        r'[:\s][\$€£¥][\s]*([0-9]{1,}[,.][0-9]{2})\s*(?:$|[\n])',
        # Line ending with amount
        r'([0-9]{1,}[,.][0-9]{2})\s*$',
    ]

    for pattern in total_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            amount = match.group(1)
            # Only accept if it looks reasonable (between $0.01 and $999,999.99)
            amount_float = float(amount.replace(',', '.'))
            if 0.01 <= amount_float <= 999999.99:
                fields['total_amount'] = amount
                break
        if 'total_amount' in fields:
            break

    # ===== DATE EXTRACTION =====
    # Handles multiple date formats across languages
    date_patterns = [
        # MM/DD/YYYY or DD/MM/YYYY
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        # YYYY/MM/DD or YYYY-MM-DD
        r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
        # Month names (English)
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}',
        # With time (e.g., "11/9/2025 12:01")
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+\d{1,2}:\d{2}',
    ]

    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Extract just the date part (without time)
            date_str = match.group(1) if match.lastindex >= 1 else match.group(0)
            fields['date'] = date_str.strip()
            break

    # ===== MERCHANT NAME EXTRACTION =====
    # More intelligent merchant name detection
    lines = text.split('\n')
    if lines:
        # Filter and clean lines
        candidate_lines = []
        for line in lines[:10]:  # Check first 10 lines
            cleaned = line.strip()

            # Skip empty lines, numbers-only, and common non-merchant patterns
            if not cleaned:
                continue
            if re.match(r'^[\d\s\-\*]+$', cleaned):  # Just numbers/symbols
                continue
            if len(cleaned) < 3 or len(cleaned) > 150:  # Unreasonable length
                continue

            # Skip known non-merchant patterns
            skip_keywords = [
                'total', 'amount', 'payment', 'cash', 'credit', 'change',
                'date', 'time', 'order', 'check', 'receipt', 'invoice',
                'subtotal', 'tax', 'gratuity', 'tip', 'void', 'quantity',
                'price', 'each', 'qty', 'items', 'thank', 'welcome'
            ]

            if any(keyword in cleaned.lower() for keyword in skip_keywords):
                continue

            # Avoid lines that are just IDs, receipts numbers, etc.
            if re.match(r'^[A-Z0-9]{15,}$', cleaned):  # Long alphanumeric codes
                continue

            candidate_lines.append(cleaned)

        # Use the first good candidate as merchant name
        if candidate_lines:
            fields['merchant_name'] = candidate_lines[0]

    # ===== SUBTOTAL EXTRACTION (Optional) =====
    subtotal_patterns = [
        r'(?:Subtotal|SUBTOTAL|Sub Total|SUB TOTAL)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:Subtotal|SUBTOTAL)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
    ]

    for pattern in subtotal_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['subtotal'] = match.group(1)
            break

    # ===== TAX EXTRACTION (Optional) =====
    tax_patterns = [
        r'(?:Tax|TAX|Sales Tax|SALES TAX)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
        r'(?:GST|VAT|IVA|TAXES)\s*[:\$€£¥]?\s*([0-9]{1,}[,.][0-9]{2})',
    ]

    for pattern in tax_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields['tax'] = match.group(1)
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
            "imageUrl": "ipfs://QmXxxx..." or "https://..." or "data:image/jpeg;base64,..." or raw base64
        }

    Supports:
    - IPFS URLs: ipfs://QmXxxx... or ipfs://bafyb...
    - HTTP URLs: https://example.com/image.jpg
    - Data URLs: data:image/jpeg;base64,/9j/4AAQSkZJRg...
    - Raw base64: /9j/4AAQSkZJRg... (without data URL prefix)

    Returns:
        {
            "text": "full extracted text",
            "fields": {
                "total_amount": "25.50",
                "date": "11/22/2024",
                "merchant_name": "Store Name",
                "subtotal": "24.01",
                "tax": "1.49"
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
        image_input = data.get('imageUrl')

        if not image_input:
            return jsonify({
                "error": "Missing 'imageUrl' in request body. Supports: IPFS URLs, HTTP URLs, base64 data URLs, or raw base64 strings",
                "success": False
            }), 400

        # Load image from various sources (base64, IPFS, HTTP)
        try:
            image = load_image_from_source(image_input)
        except ValueError as e:
            return jsonify({
                "error": str(e),
                "success": False
            }), 400

        # Preprocess image for better OCR quality
        try:
            image = preprocess_image(image)
        except Exception as e:
            print(f"Preprocessing error (continuing with original): {e}")

        # Run OCR with all available languages
        try:
            # Use all installed Tesseract languages for maximum accuracy
            # Supports: English, Spanish, French, German, Italian, Portuguese,
            # Dutch, Polish, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Thai, etc.
            extracted_text = pytesseract.image_to_string(image, lang='eng+spa+fra+deu+ita+por+nld+pol+rus+chi_sim+chi_tra+jpn+kor+ara+hin+tha+tur+heb+grc+ukr+ron+ces+hun+hrv+slv+srp+bul+cat+dan+fin+gle+glg+eus+afr+swa')
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
        for image_input in image_urls:
            # Process each image (supports IPFS, HTTP, base64)
            try:
                # Load image from various sources
                image = load_image_from_source(image_input)

                # Preprocess image for better OCR quality
                image = preprocess_image(image)

                # Run OCR with all available languages
                extracted_text = pytesseract.image_to_string(image, lang='eng+spa+fra+deu+ita+por+nld+pol+rus+chi_sim+chi_tra+jpn+kor+ara+hin+tha+tur+heb+grc+ukr+ron+ces+hun+hrv+slv+srp+bul+cat+dan+fin+gle+glg+eus+afr+swa')
                fields = extract_receipt_fields(extracted_text)

                results.append({
                    "imageUrl": image_input,
                    "text": extracted_text,
                    "fields": fields,
                    "success": True
                })
            except Exception as e:
                results.append({
                    "imageUrl": image_input,
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
