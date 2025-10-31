# NillionVault Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Render + Vercel (Recommended - Easiest)

**Backend (Render)**
1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `hitman298/NillionVault`
4. Configure service:
   - **Name**: `nillionvault-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free tier (or paid for better performance)
5. Add environment variables (see below)
6. Deploy!

**Frontend (Vercel)**
1. Go to [Vercel.com](https://vercel.com) and sign up/login
2. Click "Add New" → "Project"
3. Import your GitHub repository: `hitman298/NillionVault`
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend/public`
   - **Build Command**: (leave empty - static files)
   - **Output Directory**: `frontend/public`
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g., `https://nillionvault-backend.onrender.com`)
6. Update frontend `index.html` API base URL to your Render backend URL
7. Deploy!

### Option 2: Railway (Full Stack - Simplest)

1. Go to [Railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository: `hitman298/NillionVault`
4. Add two services:

   **Backend Service:**
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Add all environment variables (see below)

   **Frontend Service:**
   - Root Directory: `frontend/public`
   - Build Command: (none - static files)
   - Start Command: `node server.js`
   - Add environment variable: `PORT=3000`
5. Deploy both services!

### Option 3: Render Full Stack (Single Platform)

Deploy both frontend and backend on Render:

**Backend Service:**
- Follow "Backend (Render)" instructions above

**Frontend Service:**
1. Create another web service on Render
2. Name: `nillionvault-frontend`
3. Build Command: (leave empty)
4. Start Command: `cd frontend/public && node server.js`
5. Environment Variable: `PORT=3000`
6. Deploy!

### Option 4: Docker (Self-hosted/VPS)

```bash
# Build and run
docker-compose -f deploy/docker-compose.yml up --build

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## 🔐 Environment Variables

### Backend Environment Variables (Required)

Add these to your backend service (Render/Railway/Docker):

```env
# =============================================================================
# NILLION CONFIGURATION (Required)
# =============================================================================
BUILDER_PRIVATE_KEY=your_hex_private_key_here

# Nillion Testnet URLs (DO NOT CHANGE)
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
NILLION_NETWORK=testnet

# =============================================================================
# SERVER CONFIGURATION (Required)
# =============================================================================
PORT=3001
NODE_ENV=production

# =============================================================================
# FRONTEND URL (Required for CORS)
# =============================================================================
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend Configuration

Update the API base URL in `frontend/public/index.html`:
- Find: `const API_BASE_URL = 'http://localhost:3001';`
- Replace with: `const API_BASE_URL = 'https://your-backend-url.onrender.com';`

## 📋 Nillion Network Setup

### 1. Get Your Private Key
1. Visit [Nillion Testnet UI](https://testnet.nillion.network)
2. Create a new wallet or import existing
3. Copy your private key (hex format)

### 2. Fund Your Account
1. Go to [Nillion Faucet](https://faucet.nillion.network)
2. Request testnet NIL tokens
3. Wait for confirmation

### 3. Subscribe to nilDB
1. Visit [nilPay](https://nilpay.nillion.network)
2. Subscribe to nilDB service (28 NIL/month on testnet)
3. Ensure subscription is active

### 4. Configure Builder
- Your private key will be used to auto-register as a builder
- The system handles builder registration automatically on first run

## 🔧 Platform-Specific Instructions

### Render.com

**Backend:**
1. Create a new "Web Service"
2. Connect GitHub repo
3. Settings:
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free (or paid)
4. Add all environment variables from the Backend section above
5. Click "Create Web Service"

**Note**: Free tier services spin down after 15 minutes of inactivity. Upgrade to paid for always-on.

### Vercel

**Frontend:**
1. Import GitHub repository
2. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend/public`
   - **Build Command**: (empty)
   - **Output Directory**: `frontend/public`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: Your backend URL
4. Deploy

### Railway

**Both Services:**
1. Create new project from GitHub
2. Add service for backend:
   - Root: `backend`
   - Start: `npm start`
3. Add service for frontend:
   - Root: `frontend/public`
   - Start: `node server.js`
   - Port: `3000`
4. Add environment variables to backend service
5. Deploy

## 🌐 Domain Configuration

### Custom Domain Setup

1. **Backend Domain (Render/Railway)**
   - Go to your service settings
   - Click "Add Custom Domain"
   - Configure DNS records as instructed
   - Update `FRONTEND_URL` environment variable

2. **Frontend Domain (Vercel)**
   - Go to project settings → Domains
   - Add custom domain
   - Configure DNS
   - Update API base URL in `index.html`

### CORS Configuration

The backend automatically allows CORS from your `FRONTEND_URL`. Make sure:
- `FRONTEND_URL` matches your actual frontend domain exactly
- Include protocol (`https://`)
- No trailing slash

## ✅ Post-Deployment Checklist

### Testing

1. **Health Check**
   - Visit: `https://your-backend-url/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend Load**
   - Visit your frontend URL
   - Should load the NillionVault interface

3. **Upload Test**
   - Upload a test message
   - Verify success message
   - Copy the verification hash

4. **Verification Test**
   - Use the hash to verify
   - Should retrieve the message

5. **List Messages**
   - Click "My Messages"
   - Should display stored messages

### Monitoring

- **Backend Logs**: Check Render/Railway logs for errors
- **Health Endpoint**: Monitor `/health` endpoint
- **Nillion Status**: Verify Nillion testnet is operational

## 🐛 Troubleshooting

### Common Issues

1. **"Builder registration failed"**
   - Verify `BUILDER_PRIVATE_KEY` is correct
   - Check Nillion testnet connectivity
   - Ensure nilDB subscription is active

2. **CORS Errors**
   - Verify `FRONTEND_URL` matches your frontend domain exactly
   - Check frontend API base URL is correct
   - Ensure no trailing slashes

3. **"NillionDB storage failed"**
   - Check Nillion testnet status
   - Verify nilDB subscription
   - Check private key format

4. **Backend Not Starting**
   - Check all required environment variables are set
   - Verify build logs for errors
   - Check Node.js version (18+)

5. **Frontend Can't Connect**
   - Verify backend URL in `index.html`
   - Check backend is running and healthy
   - Verify CORS configuration

### Support Resources

- [Nillion Documentation](https://docs.nillion.network)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)

## 🔒 Security Best Practices

- ✅ Never commit `.env` files to Git
- ✅ Use environment variables for all secrets
- ✅ Enable HTTPS on all domains
- ✅ Keep dependencies updated
- ✅ Monitor for security advisories
- ✅ Use strong, unique private keys

## 📊 Maintenance

### Regular Updates

1. Keep dependencies updated: `npm update`
2. Monitor Nillion network updates
3. Check for security patches
4. Update environment variables as needed

### Monitoring

1. Set up uptime monitoring (UptimeRobot, etc.)
2. Monitor backend logs for errors
3. Track API response times
4. Monitor Nillion testnet status

---

**Need Help?** Open an issue on GitHub or check the troubleshooting section above.
