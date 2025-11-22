#!/bin/bash
# Install all Tesseract language packs
# Note: Skips packages that don't exist in repository

echo "=== Installing All Tesseract Language Packs ==="
echo ""

# Define all language packages to install
PACKAGES=(
  # European Languages
  "tesseract-ocr-eng"
  "tesseract-ocr-spa"
  "tesseract-ocr-fra"
  "tesseract-ocr-deu"
  "tesseract-ocr-ita"
  "tesseract-ocr-por"
  "tesseract-ocr-nld"
  "tesseract-ocr-pol"
  "tesseract-ocr-rus"
  "tesseract-ocr-ukr"
  "tesseract-ocr-ron"
  "tesseract-ocr-ces"
  "tesseract-ocr-hun"
  "tesseract-ocr-hrv"
  "tesseract-ocr-slv"
  "tesseract-ocr-srp"
  "tesseract-ocr-bul"
  "tesseract-ocr-cat"
  "tesseract-ocr-dan"
  "tesseract-ocr-fin"
  "tesseract-ocr-gle"
  "tesseract-ocr-glg"
  "tesseract-ocr-eus"
  # Asian Languages
  "tesseract-ocr-chi-sim"
  "tesseract-ocr-chi-tra"
  "tesseract-ocr-jpn"
  "tesseract-ocr-kor"
  "tesseract-ocr-hin"
  "tesseract-ocr-tha"
  # Middle Eastern & Other Languages
  "tesseract-ocr-ara"
  "tesseract-ocr-heb"
  "tesseract-ocr-tur"
  "tesseract-ocr-grc"
  # African Languages
  "tesseract-ocr-afr"
  "tesseract-ocr-swa"
)

FAILED_PACKAGES=()
INSTALLED_PACKAGES=()

echo "Installing ${#PACKAGES[@]} language packs..."
echo ""

for package in "${PACKAGES[@]}"; do
  echo -n "Installing $package... "
  if sudo apt install -y "$package" 2>/dev/null >/dev/null; then
    echo "✓"
    INSTALLED_PACKAGES+=("$package")
  else
    echo "✗ (not found in repository)"
    FAILED_PACKAGES+=("$package")
  fi
done

# Verify installation
echo ""
echo "=== Language Pack Installation Complete ==="
echo ""
echo "Successfully installed: ${#INSTALLED_PACKAGES[@]} packages"
if [ ${#FAILED_PACKAGES[@]} -gt 0 ]; then
  echo "Failed to install: ${#FAILED_PACKAGES[@]} packages"
  echo "Failed packages: ${FAILED_PACKAGES[*]}"
fi
echo ""
echo "Installed language codes:"
tesseract --list-langs

echo ""
echo "Language pack installation complete!"
