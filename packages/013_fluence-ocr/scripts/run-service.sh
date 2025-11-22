#!/bin/bash
# Run the Fluence OCR Service
set -e

# Configuration
APP_DIR="${APP_DIR:-/opt/fluence-ocr}"
VENV_DIR="$APP_DIR/venv"
SERVICE_FILE="$APP_DIR/src/service.py"
OCR_SERVICE_PORT="${OCR_SERVICE_PORT:-5000}"

# Check if virtual environment exists
if [ ! -d "$VENV_DIR" ]; then
    echo "Error: Virtual environment not found at $VENV_DIR"
    echo "Please run setup-vm.sh first"
    exit 1
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Change to app directory
cd "$APP_DIR"

# Export port
export OCR_SERVICE_PORT

echo "Starting Fluence OCR Service on port $OCR_SERVICE_PORT..."
python3 "$SERVICE_FILE"
