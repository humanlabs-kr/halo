#!/bin/bash

check_openssl() {
    if ! command -v openssl &> /dev/null; then
        echo "❌ OpenSSL is not installed or not in PATH"
        echo ""
        echo "To install OpenSSL, run:"
        echo "  brew install openssl"
        echo ""
        echo "After installation, you may need to add it to your PATH:"
        echo "  echo 'export PATH=\"/opt/homebrew/opt/openssl@3/bin:\$PATH\"' >> ~/.zshrc"
        echo "  source ~/.zshrc"
        echo ""
        exit 1
    fi
}

check_openssl

PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw8iQhVcNMExNYdOIreFT
RFjwKTbsnc+s2ITySTMkQbOgWYFAMK33p26p471v9qxvdfD1kIkjAdQIftxiNc31
Xyd34tBTroCYWzlEEn57YigYnWrzYOF//9bxlOqPAOxZBrKMosQy3PLLIVi6Tpgm
jk+J54aWb476AwrOFiP+n3ZrOk15oq3hTvM2nIsI4mgdGE73+sBD846LK0l3kSkG
XNC9nO4V64CVyeQOLjhMP9s58HoeQPTCZJ7loqVvsxfSjTSqIMelo/WtSlktbECW
Dl36lm77BhfNNfVRgCvsgF2RolLC7SPsxmSdhD0xtSRhtPCTUcYd8aT1wXTqXtaW
BwIDAQAB
-----END PUBLIC KEY-----"

if [ "$1" == "encrypt" ]; then
    if [ -f "env.jsonc" ]; then
        INPUT_FILE="env.jsonc"
    else
        echo "❌ No environment file found. Looking for env.jsonc in directory"
        exit 1
    fi
    AES_KEY=$(openssl rand -hex 32)
    echo "$AES_KEY" | openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 -in "$INPUT_FILE" -out ./env.jsonc.enc -pass stdin
    
    echo "$PUBLIC_KEY" > /tmp/public_key.pem
    echo "$AES_KEY" | openssl pkeyutl -encrypt -pubin -inkey /tmp/public_key.pem > ./env.jsonc.key.enc
    rm /tmp/public_key.pem
    
    echo "✅ File encrypted successfully"
    echo "   - ./env.jsonc.enc (encrypted file)"
    echo "   - ./env.jsonc.key.enc (encrypted AES key)"
elif [ "$1" == "decrypt" ]; then
    if [ ! -f "./decrypt.pem" ]; then
        echo "❌ ./decrypt.pem file not found."
        exit 1
    fi
    
    if [ ! -f "./env.jsonc.enc" ] || [ ! -f "./env.jsonc.key.enc" ]; then
        echo "❌ Encrypted files not found. Run 'encrypt' first."
        exit 1
    fi
    
    AES_KEY=$(openssl pkeyutl -decrypt -inkey ./decrypt.pem -in ./env.jsonc.key.enc 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$AES_KEY" ]; then
        echo "❌ Failed to decrypt AES key. The private key may be incorrect or corrupted."
        exit 1
    fi
    
    echo "$AES_KEY" | openssl enc -aes-256-cbc -d -salt -pbkdf2 -iter 100000 -in ./env.jsonc.enc -out ./env.jsonc -pass stdin 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "❌ Failed to decrypt file. The data may be corrupted or the key is incorrect."
        exit 1
    fi
    
    echo "✅ File decrypted successfully"
fi

