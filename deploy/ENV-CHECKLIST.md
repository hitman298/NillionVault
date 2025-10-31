# Environment Variables Checklist for Render

Use this checklist to ensure all required environment variables are set in your Render backend service.

## ✅ Required Variables

Go to your Render service → **Environment** tab and add these:

### 1. Nillion Configuration (REQUIRED)

```
✅ BUILDER_PRIVATE_KEY
   Value: Your 64-character hex private key from Nillion
   Example: 2b843e80e1a5f3c9d7e4b6a8c2f1d9e3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3
   
✅ NILCHAIN_URL
   Value: http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
   (DO NOT CHANGE - This is the testnet URL)
   
✅ NILAUTH_URL
   Value: https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
   (DO NOT CHANGE - This is the testnet URL)
   
✅ NILDB_NODES
   Value: https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
   (DO NOT CHANGE - These are the testnet nodes)
   
✅ NILLION_NETWORK
   Value: testnet
   (DO NOT CHANGE)
```

### 2. Server Configuration (REQUIRED)

```
✅ NODE_ENV
   Value: production
   
✅ PORT
   Value: 10000
   (Render uses port 10000, or leave empty for Render to auto-assign)
```

### 3. CORS Configuration (REQUIRED)

```
✅ FRONTEND_URL
   Value: https://nillionvault-frontend.onrender.com
   (Update with your actual frontend URL)
   
   OR if using Vercel:
   Value: https://your-app-name.vercel.app
```

## 📝 Quick Copy-Paste for Render

Copy this into Render's Environment section (one per line):

```
BUILDER_PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network
NILLION_NETWORK=testnet
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://nillionvault-frontend.onrender.com
```

**Important:** Replace `YOUR_PRIVATE_KEY_HERE` with your actual Nillion private key!

## 🔍 How to Check Logs

After adding variables and redeploying:

1. Go to Render Dashboard → Your Service
2. Click **"Logs"** tab
3. Look for:
   - ✅ `✅ set` = Variable is present
   - ❌ `❌ missing` = Variable is missing
   - ❌ Error messages about which variable is invalid

## 🐛 Common Issues

### Issue: "BUILDER_PRIVATE_KEY must be 64-character hexadecimal"

**Fix:** 
- Your private key must be exactly 64 hex characters (0-9, a-f)
- No spaces, no dashes
- Example format: `2b843e80e1a5f3c9d7e4b6a8c2f1d9e3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3`

### Issue: "Invalid URL in environment variables"

**Fix:**
- Make sure URLs don't have spaces
- NILDB_NODES should be comma-separated (no spaces after commas)
- All URLs should start with `http://` or `https://`

### Issue: "Application exited early"

**Fix:**
- Check logs to see which variable is missing
- Verify all variables are set (no typos)
- Make sure there are no extra spaces in values

## ✅ Verification Steps

After setting all variables:

1. **Save Changes** in Render
2. **Manual Deploy** → **Deploy latest commit**
3. Wait for deployment (2-5 minutes)
4. Check **Logs** tab for:
   ```
   ✅ Environment variables validated
   🔐 NillionDB integration: ENABLED (testnet only)
   🚀 NillionVault Backend running on port 10000
   ```
5. Test health endpoint:
   ```
   https://nillionvault-backend.onrender.com/health
   ```
   Should return: `{"status":"healthy",...}`

---

**Need Help?** Check the Render logs - they now show exactly which variables are missing!

