# Halo

> A World Chain miniapp that turns real receipts into onchain rewards for verified humans.

[![World Chain](https://img.shields.io/badge/World%20Chain-Miniapp-blue)](https://worldcoin.org/world-chain)
[![Fluence](https://img.shields.io/badge/Fluence-Decentralized%20Compute-green)](https://fluence.network/)
[![Filecoin](https://img.shields.io/badge/Filecoin-Synapse%20SDK-purple)](https://filecoin.io/)

## Overview

Halo is a production-ready World Chain miniapp that rewards real humans for scanning their everyday receipts using World ID verification. Users simply take a photo of any receipt, and Halo processes it through a decentralized pipeline to extract valuable data and award points. Personal identity remains private throughout the entire flow.

**Everything is on mainnet and the miniapp is submitted to go live on World App store.**

## The Problem

Everyday, billions of receipts are created worldwide. These receipts represent real proof of real human economic activity—grocery shopping, dining out, travel, and daily errands. However, there is no clean way to connect offline spending with onchain rewards.

Receipts contain valuable signals about real economic behavior, but this information is usually lost or locked inside closed systems. Halo captures this data responsibly and creates a sybil-resistant, privacy-preserving way to connect offline actions to onchain rewards.

## The Solution

Halo turns everyday spending into meaningful and rewardable activity. Each receipt is processed to extract details such as merchant, timestamp, total amount, currency, and category. Rewards can only be claimed by unique humans verified through World ID, creating a global and user-owned layer of offline economic truth powered by real humans instead of bots or disposable wallets.

### Key Features

- ✅ **World ID Verification** - Sybil-resistant identity layer ensures only real humans can claim rewards
- ✅ **Decentralized OCR** - Fluence CPU handles text extraction from receipts globally
- ✅ **Censorship-Resistant Storage** - Filecoin Synapse SDK stores receipt images permanently
- ✅ **Quality Scoring** - Intelligent evaluation system rates receipt quality and awards points
- ✅ **Privacy-Preserving** - Personal identity remains private throughout the flow
- ✅ **Production-Ready** - Built for scale, not just a demo
- ✅ **Global Support** - Multi-language OCR support (35+ languages)

### Decentralized Infrastructure

1. **World ID** - Provides proof of humanness and sybil resistance
2. **Fluence CPU** - Decentralized OCR processing with 35+ language support
3. **Filecoin Synapse SDK** - Encrypted, durable, verifiable storage of receipt images

## How It Works

1. **User Authentication**: Wallet auth on World Chain enables Halo to read wallet and World username
2. **Receipt Upload**: User takes a photo of a receipt through the miniapp
3. **Image Storage**: Receipt image is encrypted and stored on Filecoin using Synapse SDK (mainnet with payment rail setup)
4. **OCR Processing**: Image is sent to Fluence decentralized compute for OCR text extraction
5. **Data Extraction**: Extracted text is parsed to identify key fields:
   - Merchant name
   - Total amount
   - Date and timestamp
   - Currency
   - Category
6. **Quality Scoring**: Receipt is evaluated and assigned a quality score
7. **Reward Assignment**: Points are awarded based on receipt quality
8. **Verification**: All rewards require World ID verification to ensure sybil resistance

## Production Status

✅ **Mainnet Deployment**: All services running on mainnet  
✅ **World App Submission**: Miniapp submitted for World App store  
✅ **Payment Rails**: Filecoin Synapse SDK payment setup complete  
✅ **Scalability**: Architecture designed for 50,000+ weekly active users

## License

MIT

---

_Real receipts. Real humans. Real rewards._
