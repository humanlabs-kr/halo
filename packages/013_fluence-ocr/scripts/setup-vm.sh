#!/bin/bash
# Fluence VM Setup Script

set -e

echo "=== Fluence OCR Service Setup ==="
echo "Installing dependencies..."

# Update package lists
sudo apt update

# Install system dependencies for Tesseract OCR
echo "Installing Tesseract OCR and dependencies..."
sudo apt install -y \
    tesseract-ocr \
    libtesseract-dev \
    python3-pip \
    python3-dev \
    python3-venv \
    git \
    curl

# Verify Tesseract installation
tesseract --version
echo "Tesseract installed successfully"

# Create application directory
APP_DIR="/opt/fluence-ocr"
echo "Creating application directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
sudo chown -R $(whoami):$(whoami) $APP_DIR

# Clone or copy the OCR service code
echo "Setting up application files..."
cd $APP_DIR

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "=== Setup Complete ==="
echo "Health check: curl http://localhost:5000/health"
