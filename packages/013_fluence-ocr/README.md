# OCR powered by Fluence CPU Cloud

Decentralized OCR microservice running on Fluence CPU Cloud. Processes receipt images via IPFS/HTTP/Base64 and extracts structured data (total, date, merchant, tax, subtotal)

```bash
# Maybe wanna TEST BEFORE READING EVERYTHING?
# Just run this on your terminal:
# PF chang receipt from DCA Washington Airport transit lol

curl -X POST http://94.103.168.85:5000/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"ipfs://bafybeians7ntyulxnxzjy37ntsr6ipbrpzeapy7q5lsafchvzdlqaoqbcu"}'
```

## (Serious) Expectations

- We expect to serve **50,000+ WAU \* max 35 receipts a week per user = 1.75M receipts** within the **next 30 days** (with existing partners lined up, very doable)
- While the extraction logic and quality will improve, a strong reliable and affordable CPU is a MUST

## What It Does

- Accepts receipt images from IPFS, HTTPS, or base64
- Runs Tesseract OCR with 35+ language support
- Extracts: total_amount, date, merchant_name, subtotal, tax
- Image preprocessing: contrast enhancement, sharpening, noise reduction
- Single + batch processing endpoints
- Runs on decentralized Fluence infra

## How to Use It

### Deploy to Fluence VM

```bash
# Generate SSH keys
(with your favorite method)

# Copy setup script to VM
scp -i .ssh/fluence_vm_key scripts/setup-vm.sh root@YOUR_VM_IP:/opt/

# SSH and run setup
ssh -i .ssh/fluence_vm_key root@YOUR_VM_IP
cd /opt && bash setup-vm.sh
```

### Run Locally

```bash
cd packages/013_fluence-ocr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 src/service.py
```

Service runs on `http://localhost:5000`

### Useful Commands (b/c i'd forget about these later..)

```bash
# Move files to VM
scp -i .ssh/fluence_vm_key packages/013_fluence-ocr/src/service.py root@YOUR_VM_IP:/opt/fluence-ocr/src/
scp -i .ssh/fluence_vm_key packages/013_fluence-ocr/src/client.ts root@YOUR_VM_IP:/opt/fluence-ocr/src/

# SSH into VM
ssh -i .ssh/fluence_vm_key root@YOUR_VM_IP

# On VM
sudo systemctl restart fluence-ocr
sudo systemctl status fluence-ocr
curl http://localhost:5000/health

# View logs
sudo journalctl -u fluence-ocr -f
```

## API Examples (check if ours actually work!)

### Test Endpoints

```bash
# Health check
curl http://94.103.168.85:5000/health

# Single receipt with IPFS (PF chang receipt from DCA Washington Airport transit lol)
curl -X POST http://94.103.168.85:5000/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"ipfs://bafybeians7ntyulxnxzjy37ntsr6ipbrpzeapy7q5lsafchvzdlqaoqbcu"}'

# HTTPS URL (replace w/ your own img)
curl -X POST http://94.103.168.85:5000/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/receipt.jpg"}'

# Base64 (replace w/ your own base64)
curl -X POST http://94.103.168.85:5000/ocr \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"data:image/jpeg;base64,/9j/4AAQSkZJRg..."}'

# Batch processing (replace w/ your own batch)
curl -X POST http://94.103.168.85:5000/ocr/batch \
  -H "Content-Type: application/json" \
  -d '{"imageUrls":["ipfs://Qm1...","https://..."]}'
```

### Response Format

```json
{
  "text": "Full OCR text...",
  "fields": {
    "total_amount": "42.20",
    "date": "11/22/2025",
    "merchant_name": "ETH Global Bueno Aires",
    "subtotal": "39.69",
    "tax": "2.51"
  },
  "success": true
}
```

![OCR Response Example](screenshot-response-example.png)

## Current VM on Fluence

- **VM**: 94.103.168.85:5000
- **Location**: DE-FRA-1
- **OS**: Ubuntu 24.04 (LTS) x64
- **CPU**: AMD EPYC ZEN 5 9965 4 vCPU
- **RAM**: DDR5 8 GB
- **DAS Storage**: NVMe 4000 MB/s 25 GB
- **Awesome**: Daily usage $0.62/ day

## Languages Installed

- **Total 35**: (English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Ukrainian, Romanian, Czech, Hungarian, Croatian, Slovenian, Serbian, Bulgarian, Catalan, Danish, Finnish, Irish, Galician, Basque, Simplified Chinese, Traditional Chinese, Japanese, Korean, Hindi, Thai, Arabic, Hebrew, Turkish, Greek, Afrikaans, Swahili)

## Next Steps

- GPU acceleration via Fluence GPU Containers
- Blockchain integration for verified receipts
- Multi-provider redundancy
- Caching layer (Redis/KV)
- ML-based field extraction
- Webhook support for async processing

## License

MIT - See LICENSE file
