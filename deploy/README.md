# NillionVault Deployment

This directory contains deployment configurations for NillionVault.

## 📁 Files

- **DEPLOYMENT.md** - Complete deployment guide with step-by-step instructions
- **render.yaml** - Render.com deployment configuration
- **docker-compose.yml** - Docker deployment for self-hosting
- **README.md** - This file

## 🚀 Quick Start

### Option 1: Render (Easiest - Recommended)

1. **Backend:**
   ```bash
   # Use render.yaml configuration
   # Or manually:
   # - Go to render.com
   # - New Web Service
   # - Connect GitHub repo
   # - Use settings from DEPLOYMENT.md
   ```

2. **Frontend:**
   ```bash
   # Option A: Use Vercel (recommended for static sites)
   # - Go to vercel.com
   # - Import repo
   # - Root: frontend/public
   
   # Option B: Use Render (same platform)
   # - Create another web service
   # - Root: frontend/public
   # - Start: node server.js
   ```

### Option 2: Railway (Full Stack)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Add two services:
   - Backend: `backend` directory
   - Frontend: `frontend/public` directory
4. Add environment variables (see DEPLOYMENT.md)

### Option 3: Docker

```bash
# Copy .env.example to .env and configure
cp ../backend/env.example ../backend/.env

# Edit .env with your Nillion private key
# Then deploy:
docker-compose -f deploy/docker-compose.yml up --build
```

## 🔐 Required Environment Variables

**Backend:**
- `BUILDER_PRIVATE_KEY` - Your Nillion private key (hex format)
- `NILCHAIN_URL` - Nillion testnet RPC URL (pre-configured)
- `NILAUTH_URL` - Nillion auth URL (pre-configured)
- `NILDB_NODES` - NillionDB nodes (pre-configured)
- `NILLION_NETWORK` - Set to `testnet`
- `PORT` - Backend port (3001)
- `FRONTEND_URL` - Your frontend URL (for CORS)

**Frontend:**
- Update API base URL in `frontend/public/index.html` to your backend URL

## 📖 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions.

## 🆘 Need Help?

- Check [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section
- Open an issue on GitHub
- Check Nillion testnet status
