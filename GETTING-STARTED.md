# 🚀 NillionVault Getting Started Guide

Welcome to NillionVault! This guide will help you get the system running with real blockchain services.

## 📋 Quick Overview

NillionVault is a complete credential anchoring system that:
- ✅ Stores encrypted credentials in Nillion SecretVaults
- ✅ Anchors proof hashes to nilChain testnet
- ✅ Provides public verification via blockchain explorer
- ✅ Uses real blockchain infrastructure (not mock)

## 🎯 What You Need

### 1. **28 NIL Tokens** (The Main Challenge)
- **Problem**: Faucet only gives 0.1 NIL per day
- **Solution**: Contact Nillion team for additional testnet tokens
- **Where to ask**: https://nucleus.nillion.com (Builders Program)

### 2. **Free Tier Services**
- Supabase (database)
- Upstash Redis (queue)
- Render (backend hosting)
- Vercel (frontend hosting)

## 🛠️ Step-by-Step Setup

### Step 1: Get NIL Tokens

**Option A: Contact Nillion Team (Recommended)**
1. Go to https://nucleus.nillion.com
2. Apply for Builders Program
3. Explain you're building NillionVault
4. Request additional testnet tokens

**Option B: Wait for Faucet**
- 0.1 NIL × 280 days = 28 NIL tokens
- Not practical for development

### Step 2: Set Up Nillion Services

1. **Create Nillion Wallet**
   - Go to: https://docs.nillion.com/community/guides/nillion-wallet
   - Save your seed phrase securely

2. **Get Faucet Tokens**
   - Go to: https://faucet.testnet.nillion.com/
   - Request 0.1 NIL daily

3. **Subscribe to nilDB Service**
   - Go to: https://nilpay.vercel.app/
   - Pay 28 NIL tokens for nilDB subscription
   - Get your API key

### Step 3: Set Up Other Services

1. **Supabase Database**
   - Create project at https://supabase.com
   - Run SQL schema from `database/schema.sql`
   - Get database URL and service role key

2. **Upstash Redis**
   - Create free instance at https://upstash.com
   - Get REST URL and token

### Step 4: Configure Environment

**Backend (.env):**
```bash
# Nillion (REAL VALUES)
NILLION_API_KEY=your_actual_api_key_here
NILLION_RPC_URL=https://rpc-testnet.nillion.com
NILLION_NETWORK=testnet
DEV_ADDRESS_PRIVATE_KEY=your_wallet_private_key

# Supabase
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_NILLION_EXPLORER=https://testnet.nillion.explorers.guru
```

### Step 5: Install and Test

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Test Nillion integration
cd backend && node test-nillion-integration.js

# Start development servers
cd backend && npm run dev  # Port 3001
cd frontend && npm run dev # Port 3000
```

## 🧪 Testing the System

### 1. Upload a Credential
- Go to http://localhost:3000
- Upload a file or paste JSON data
- Note the proof hash

### 2. Verify the Credential
- Go to http://localhost:3000/verify
- Paste the proof hash
- Check verification results

### 3. Check Blockchain
- Wait for anchoring (may take a few minutes)
- Click "View on Explorer"
- Verify transaction on testnet explorer

## 🔍 Verification Process

Anyone can verify your credentials:

1. **Get the proof hash** from your upload
2. **Run the hash tool**: `node tools/hash.js your-file`
3. **Compare hashes** (should match exactly)
4. **Check blockchain**: Visit txHash on testnet explorer
5. **Verify memo field** contains the proof hash

## 🚨 Troubleshooting

### Common Issues

**"Insufficient NIL tokens"**
- Contact Nillion team for additional testnet tokens
- Join Builders Program: https://nucleus.nillion.com

**"Invalid API key"**
- Verify nilDB subscription at https://nilpay.vercel.app/
- Check API key in backend/.env

**"Database connection failed"**
- Verify Supabase credentials
- Run database schema

**"Redis connection failed"**
- Check Upstash Redis credentials
- Verify Redis instance is active

### Getting Help

- **Nillion Community**: https://docs.nillion.com/community-and-support
- **Builders Program**: https://nucleus.nillion.com
- **Status Page**: https://status.nillion.com

## 🎉 Success Indicators

You'll know it's working when:

✅ **Upload works** - File gets stored in Nillion SecretVaults  
✅ **Proof hash generated** - Unique identifier for your credential  
✅ **Anchoring queued** - Background job created for blockchain  
✅ **Transaction confirmed** - Real txHash on testnet explorer  
✅ **Verification works** - Anyone can verify your credential  

## 📚 Additional Resources

- **Full Documentation**: [README.md](README.md)
- **Nillion Setup**: [docs/nillion-setup-guide.md](docs/nillion-setup-guide.md)
- **Getting NIL Tokens**: [docs/get-nil-tokens.md](docs/get-nil-tokens.md)
- **Deployment Guide**: [deploy/README.md](deploy/README.md)

## 🎯 Next Steps

1. **Get 28 NIL tokens** (contact Nillion team)
2. **Subscribe to nilDB** service
3. **Configure environment** variables
4. **Test the integration**
5. **Deploy to production**
6. **Share your success!**

Remember: NillionVault is already built and ready to work with real blockchain services. You just need to get the NIL tokens to unlock the full functionality!

---

**Need help?** The Nillion community is friendly and helpful. Don't hesitate to reach out!
