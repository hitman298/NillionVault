# ⚠️ CRITICAL FIX: Render Start Command

## The Problem

Your Render **Start Command** is currently set to:
```
cd backend && npm install
```

This is **WRONG** - it only installs packages, then exits. It doesn't start the server!

## The Fix

Change your **Start Command** to:
```
cd backend && npm start
```

OR (if build already runs in backend directory):
```
npm start
```

## Step-by-Step Fix

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your `nillionvault-backend` service
3. Go to **Settings** tab
4. Scroll to **"Start Command"** section
5. Change from:
   ```
   cd backend && npm install
   ```
   To:
   ```
   cd backend && npm start
   ```
6. Click **"Save Changes"**
7. Go to **"Manual Deploy"** → **"Deploy latest commit"**

## Correct Configuration

- **Build Command**: `cd backend && npm install` ✅ (correct)
- **Start Command**: `cd backend && npm start` ✅ (needs to be fixed)

## Why This Happens

Render runs:
1. **Build Command** → Installs dependencies
2. **Start Command** → Starts your application

If both are `npm install`, the server never starts!

---

After fixing, your deployment should show:
```
=== NillionVault Backend Starting ===
🚀 NillionVault Backend running on port 10000
✅ Server started successfully!
```

