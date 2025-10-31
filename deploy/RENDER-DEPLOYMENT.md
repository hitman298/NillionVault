# Deploy Backend to Render - Step by Step Guide

## 📋 Prerequisites

Before deploying, make sure you have:
1. ✅ Your Nillion testnet private key (hex format)
2. ✅ Your frontend URL (where you deployed the frontend)
3. ✅ GitHub repository connected/synced

## 🚀 Step-by-Step Deployment

### Step 1: Go to Render Dashboard

1. Visit [Render.com](https://render.com)
2. Sign in or create an account
3. Click **"New +"** → **"Web Service"**

### Step 2: Connect Repository

1. Choose **"Public Git repository"**
2. Enter repository URL: `https://github.com/hitman298/NillionVault`
3. Or if you have it connected, select from your repositories
4. Click **"Connect"**

### Step 3: Configure Service

**Basic Settings:**
- **Name**: `nillionvault-backend`
- **Environment**: `Node`
- **Region**: Choose closest to you (e.g., `Oregon (US West)`)

**Build & Deploy Settings:**
- **Root Directory**: (leave empty - uses root)
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

**Instance Settings:**
- **Instance Type**: `Free` (or upgrade for better performance)
- Click **"Advanced"** and set:
  - **Health Check Path**: `/health`

### Step 4: Add Environment Variables

Click **"Environment"** tab and add these variables:

#### Required Variables:

```bash
# Nillion Configuration (REQUIRED)
BUILDER_PRIVATE_KEY=your_hex_private_key_here

# Nillion Testnet URLs (DO NOT CHANGE)
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
NILLION_NETWORK=testnet

# Server Configuration (REQUIRED)
NODE_ENV=production
PORT=10000

# Frontend URL (REQUIRED - Update with your frontend URL)
FRONTEND_URL=https://your-frontend-url.vercel.app
# OR if frontend is on Render:
# FRONTEND_URL=https://nillionvault-frontend.onrender.com
```

#### How to Get Your Frontend URL:

- **If using Vercel**: Your frontend URL is like `https://your-app-name.vercel.app`
- **If using Render**: Your frontend URL is like `https://nillionvault-frontend.onrender.com`
- **If using other platform**: Use your deployed frontend URL

### Step 5: Deploy

1. Review all settings
2. Click **"Create Web Service"**
3. Wait for deployment (takes 2-5 minutes)

### Step 6: Get Your Backend URL

Once deployed, Render will give you a URL like:
```
https://nillionvault-backend.onrender.com
```

**Important**: Save this URL! You'll need it to update your frontend.

### Step 7: Update Frontend Configuration

After deployment, update your frontend to use the new backend URL:

1. If frontend is in GitHub, update `frontend/public/index.html`:
   - Find: `const API_BASE_URL = 'http://localhost:3001';`
   - Replace with: `const API_BASE_URL = 'https://nillionvault-backend.onrender.com';`
   - Commit and push changes
   - Redeploy frontend

2. Or if you can edit frontend config directly:
   - Update the API base URL to your Render backend URL

### Step 8: Verify Deployment

1. **Test Health Endpoint**:
   ```
   https://nillionvault-backend.onrender.com/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Test from Frontend**:
   - Open your frontend
   - Try uploading a message
   - Check browser console for any CORS errors

3. **Check Logs**:
   - In Render dashboard, click on your service
   - Go to **"Logs"** tab
   - Check for any errors

## 🔧 Troubleshooting

### Issue: "Builder registration failed"

**Solution:**
- Verify `BUILDER_PRIVATE_KEY` is correct (hex format)
- Check that your Nillion testnet account is funded
- Ensure nilDB subscription is active

### Issue: CORS Errors

**Solution:**
- Verify `FRONTEND_URL` matches your frontend URL exactly
- Include `https://` protocol
- No trailing slash
- Update CORS and redeploy

### Issue: Service Not Starting

**Check:**
- Build logs for errors
- Environment variables are all set
- `PORT=10000` is set (Render requirement)
- Check Runtime logs tab

### Issue: "Method not found" (Anchoring)

**This is Normal:**
- The nilChain RPC may not be fully available on testnet
- The system automatically falls back to proof-based anchoring
- Your messages are still securely stored and verifiable

### Issue: Free Tier Spins Down

**Render Free Tier:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid plan for always-on service

## 🔐 Security Checklist

- ✅ Never commit `.env` files to GitHub
- ✅ Keep `BUILDER_PRIVATE_KEY` secret
- ✅ Use HTTPS (Render provides automatically)
- ✅ CORS configured correctly
- ✅ Environment variables set in Render dashboard

## 📊 Monitoring

**Check Service Health:**
- Health endpoint: `/health`
- Render dashboard shows service status
- Check logs regularly for errors

**Useful Endpoints:**
- `GET /health` - Service health check
- `POST /api/credentials/upload` - Upload message
- `POST /api/credentials/verify` - Verify message
- `GET /api/credentials/list` - List all messages

## 🆘 Need Help?

1. Check Render logs in dashboard
2. Verify all environment variables
3. Test health endpoint
4. Check frontend console for errors
5. Review [DEPLOYMENT.md](./DEPLOYMENT.md) for more details

---

**Next Steps:**
1. Deploy backend to Render ✅ (you're doing this)
2. Update frontend API URL
3. Test end-to-end
4. Monitor and optimize

