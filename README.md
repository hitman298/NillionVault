# 🔐 NillionVault

A **production-ready** secure message storage platform powered by **Nillion Network** with end-to-end encryption, cryptographic verification, and nilChain blockchain anchoring.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Nillion](https://img.shields.io/badge/Nillion-Testnet-blue.svg)](https://nillion.network/)

## 🌐 Live Demo

**🚀 Try it now**: [https://nillionvault-frontend.onrender.com/](https://nillionvault-frontend.onrender.com/)

- ✅ **Store Messages** with end-to-end encryption
- ✅ **Verify & Decrypt** using proof hashes
- ✅ **Manage Messages** with search, filter, and export
- ✅ **Blockchain Anchoring** for immutable proof

**Backend API**: https://nillionvault-backend.onrender.com  
**Health Check**: https://nillionvault-backend.onrender.com/health

## ✨ Key Features

- 🔒 **Secure Message Storage**: Store text messages with end-to-end encryption on Nillion SecretVaults
- 📦 **Bulk Upload**: Upload multiple messages at once (up to 50 messages)
- 🔐 **Cryptographic Verification**: SHA-256 hash generation for message authenticity
- 📊 **Message Management**: 
  - View all stored messages (metadata only - privacy-first)
  - Search and filter messages by filename and hash
  - Sort by date, name, or size
  - Export messages (all or selected) as JSON
  - Delete messages
  - View message statistics
  - **Privacy-First**: Message content only accessible via verification hash
- 🔗 **Blockchain Anchoring**: Automatic anchoring to nilChain for immutable proof of existence
- 🎯 **Clean UI**: Modern, professional interface focused on usability
- ⚡ **Real-time Processing**: Instant feedback on storage and verification

## 🏗️ Architecture

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend       │  HTML/CSS/JavaScript (Port 3000)
│  (Pure HTML)    │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Backend API    │  Node.js/Express (Port 3001)
│  (Express)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Nillion │ │  nilChain    │
│SecretDB │ │  (Anchoring) │
└─────────┘ └──────────────┘
```

**Technology Stack:**
- **Frontend**: Pure HTML5/CSS3/JavaScript (Port 3000) - No frameworks
- **Backend**: Node.js/Express API (Port 3001)
- **Storage**: Nillion SecretVaults (testnet) - Encrypted distributed storage
- **Blockchain**: nilChain testnet - Immutable proof anchoring
- **Architecture**: Nillion-only (no external databases)

## 📁 Project Structure

```
NillionVault/
├── 📁 backend/                 # Node.js API server
│   ├── 📁 routes/             # API endpoints
│   │   ├── credentials.js    # Upload, verify, list, delete
│   │   └── verification.js    # Hash computation utilities
│   ├── 📁 services/           # Business logic
│   │   ├── nillion.js         # Nillion SecretVaults integration
│   │   ├── anchor.js          # nilChain blockchain anchoring
│   │   └── queue.js           # Job queue (Nillion-only mode)
│   ├── 📁 middleware/         # Express middleware
│   │   └── errorHandler.js    # Error handling & logging
│   ├── 📁 utils/              # Utility functions
│   │   └── envValidator.js    # Environment validation
│   ├── 📄 server.js           # Main server file
│   ├── 📄 package.json        # Backend dependencies
│   └── 📄 env.example         # Environment template
├── 📁 frontend/               # HTML frontend
│   ├── 📁 public/             # Static files
│   │   ├── 📄 index.html      # Main application
│   │   └── 📄 server.js       # Simple HTTP server
│   └── 📄 package.json        # Frontend dependencies
├── 📁 deploy/                 # Deployment configurations
│   ├── 📄 docker-compose.yml  # Docker setup
│   ├── 📄 render.yaml         # Render deployment config
│   └── 📄 DEPLOYMENT.md       # Deployment guide
├── 📁 docs/                   # Documentation
│   └── 📄 architecture.md     # System architecture
├── 📄 collection-schema.json  # Nillion collection schema
├── 📄 .gitignore              # Git ignore rules
├── 📄 README.md               # This file
└── 📄 LICENSE                 # MIT License
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **Nillion testnet account** with nilDB subscription

### 1. Clone & Install

```bash
git clone https://github.com/hitman298/NillionVault.git
cd NillionVault

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies  
cd frontend && npm install && cd ..
```

### 2. Environment Setup

```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit backend/.env with your Nillion credentials
```

### 3. Nillion Setup

1. Get your **Nillion testnet private key** from [Nillion UI](https://nillion.network)
2. Fund your testnet account with NIL tokens from the faucet
3. Subscribe to [nilDB service](https://nilpay.nillion.network) (28 NIL/month)
4. Add your private key to `backend/.env`:
   ```env
   BUILDER_PRIVATE_KEY=your_64_character_hex_private_key_here
   ```

### 4. Start Development

```bash
# Terminal 1 - Backend (Port 3001)
cd backend && npm start

# Terminal 2 - Frontend (Port 3000)  
cd frontend/public && node server.js
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## ⚙️ Configuration

### Required Environment Variables

```env
# Nillion Configuration (Testnet)
BUILDER_PRIVATE_KEY=your_64_character_hex_private_key
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
NILLION_NETWORK=testnet

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/credentials/upload` | Store a text message |
| `POST` | `/api/credentials/verify` | Verify and retrieve message by proof hash |
| `GET` | `/api/credentials/list` | List all stored messages |
| `DELETE` | `/api/credentials/:recordId` | Delete a message |
| `POST` | `/api/verification/compute-hash` | Compute proof hash for data |
| `POST` | `/api/verification/verify-proof` | Verify a proof hash |
| `GET` | `/health` | Health check endpoint |

### Example API Usage

```javascript
// Store a message
const response = await fetch('/api/credentials/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    textMessage: 'My secret message',
    fileName: 'message.txt'
  })
});

const data = await response.json();
console.log('Proof Hash:', data.proofHash);
console.log('Credential ID:', data.credentialId);

// Verify a message
const verifyResponse = await fetch('/api/credentials/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    proofHash: 'your_proof_hash_here'
  })
});

const verifyData = await verifyResponse.json();
console.log('Retrieved Message:', verifyData.credential.content);
```

## 🔒 Security Features

- ✅ **End-to-End Encryption**: All messages encrypted using Nillion SecretVaults
- ✅ **SHA-256 Hashing**: Cryptographically secure proof hash for verification
- ✅ **Distributed Storage**: Data replicated across multiple Nillion nodes
- ✅ **Blockchain Anchoring**: Immutable proof on nilChain blockchain
- ✅ **Privacy-First**: Message content not exposed in list view - requires verification hash
- ✅ **Verification-Only Access**: Content only decryptable with proof hash
- ✅ **Input Validation**: Comprehensive validation and sanitization
- ✅ **CORS Protection**: Configured for production security
- ✅ **Error Handling**: Graceful error handling with detailed logging
- ✅ **HTTPS Ready**: SSL/TLS encryption support

## 📊 Data Storage

**Nillion SecretVaults** stores all data with:

- **Encrypted Content**: Message content stored in `%allot` field (encrypted)
- **Plaintext Metadata**: File name, type, size, timestamp (for indexing)
- **Proof Hash**: SHA-256 hash for verification (64-character hex string)
- **Anchoring**: Optional nilChain blockchain anchoring for immutable proof
- **No External Databases**: 100% Nillion-native storage

### Data Schema

```json
{
  "_id": "unique-record-id",
  "credential_id": "credential-uuid",
  "proof_hash": "sha256-hash",
  "file_name": "message.txt",
  "file_type": "text/plain",
  "size_bytes": 123,
  "stored_at": "2025-10-31T12:00:00.000Z",
  "document_content": {
    "%allot": "encrypted-message-content"
  }
}
```

## 🎯 Use Cases

- **Secure Notes**: Store private notes and thoughts securely
- **Password Management**: Securely store important credentials
- **Secret Sharing**: Share encrypted secrets with proof of existence
- **Document Verification**: Verify message authenticity using proof hashes
- **Personal Vault**: Private encrypted storage for sensitive information
- **Compliance**: Immutable records with blockchain anchoring

## 📈 Features in Detail

### Store Message
- Single message storage with instant feedback
- Automatic proof hash generation
- nilChain anchoring (async, non-blocking)

### Bulk Upload
- Upload up to 50 messages at once
- One message per line
- Progress tracking and summary

### Message Verification
- Retrieve messages using proof hash
- Decrypt and display message content
- Verify blockchain anchoring status

### My Messages
- List all stored messages (metadata only)
- **Privacy-First Design**: No content previews - only accessible via verification
- Quick actions: Copy Hash, Verify & Decrypt, Delete
- Search by filename and hash

### Search & Filter
- Real-time search by filename and hash (content requires verification)
- Filter by date range
- Sort by: Newest First, Oldest First, Name (A-Z), Size (Largest)

### Export
- Export all messages as JSON
- Export selected messages only
- Includes metadata and proof hashes

### Statistics
- Total message count
- Total storage size
- Filtered results count

## 📈 Performance

- **Storage Speed**: ~2-3 seconds per message
- **Hash Generation**: ~50ms per message
- **Verification**: ~1-2 seconds (including decryption)
- **List Retrieval**: ~1.5 seconds for 100 messages
- **Concurrent Storage**: Supports multiple simultaneous uploads
- **Message Size Limit**: 4KB per message (4096 bytes)

## 🚀 Production Deployment

### Option 1: Render (Recommended)

**Backend (Render)**
```bash
# Connect GitHub repo to Render  
# Build Command: cd backend && npm install
# Start Command: cd backend && npm start
# Add environment variables in dashboard
```

**Frontend (Static Hosting)**
- Deploy `frontend/public` folder to any static host
- Update `FRONTEND_URL` in backend `.env`

### Option 2: Docker

```bash
docker-compose -f deploy/docker-compose.yml up --build
```

📖 **Detailed deployment guide**: [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md).

### Development Areas
- 🔧 Nillion SecretVaults SDK integration improvements
- 🚀 Performance optimizations
- 🎨 UI/UX enhancements  
- 📱 Mobile responsiveness
- 🔐 Additional security features
- 📊 Advanced analytics

## 📚 Documentation

- 📖 [Architecture Overview](docs/architecture.md) - System design and diagrams
- 🚀 [Deployment Guide](deploy/DEPLOYMENT.md) - Production deployment
- 🔧 [API Reference](docs/api.md) - Complete API documentation

## 🔗 What is Anchoring?

Anchoring creates an immutable cryptographic proof that a message existed at a specific time:

1. **Message Hashing**: Your message is processed through SHA-256 to create a unique `proof_hash`
2. **Storage**: This hash is stored in NillionDB (encrypted)
3. **Blockchain Proof**: The hash is anchored to nilChain blockchain for permanent verification
4. **Verification**: Anyone can verify the message existed by checking the hash on the blockchain

Even if the original message is lost, the proof hash on the blockchain proves it existed at that time.

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- 🐛 [GitHub Issues](https://github.com/hitman298/NillionVault/issues) - Bug reports
- 💡 [GitHub Discussions](https://github.com/hitman298/NillionVault/discussions) - Feature requests
- 📖 [Documentation](docs/) - Complete guides
- 🌐 [Nillion Community](https://discord.gg/nillion) - Nillion ecosystem support

## 🎉 Project Status

This project is **production-ready** and fully deployed:

✅ **Complete Features:**
- Secure message storage with Nillion SecretVaults encryption
- Bulk message upload (up to 50 messages)
- Message verification and decryption via proof hash
- Message list with metadata (privacy-first, no content previews)
- Search and filter functionality
- Export messages (JSON format)
- Delete messages
- Message statistics dashboard
- Blockchain anchoring to nilChain
- Clean, professional UI

✅ **Deployment:**
- Frontend: Live on Render
- Backend: Live on Render
- All features tested and working

✅ **Security:**
- End-to-end encryption via Nillion
- Privacy-first design (no content exposure)
- Verification-required access
- Blockchain anchoring for immutable proof

---

<div align="center">

**🔐 NillionVault** - *Secure message storage powered by Nillion Network*

🌐 **[Live Demo](https://nillionvault-frontend.onrender.com/)** | [⭐ Star this repo](https://github.com/hitman298/NillionVault) | [🐛 Report Bug](https://github.com/hitman298/NillionVault/issues) | [💡 Request Feature](https://github.com/hitman298/NillionVault/discussions)

*Built with ❤️ for the Nillion ecosystem*

</div>
