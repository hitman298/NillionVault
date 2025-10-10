# NillionVault Deployment Guide

This guide covers deploying NillionVault to Render (backend) and Vercel (frontend) using free tiers.

## Prerequisites

1. **Nillion Devnet Account**
   - Sign up at [Nillion Console](https://docs.nillion.com/build/private-storage/quickstart)
   - Get your API key from the developer dashboard
   - Request testnet tokens from the [faucet](https://docs.nillion.com/community/guides/testnet)

2. **Supabase Project**
   - Create a project at [Supabase](https://supabase.com/pricing)
   - Get your database URL and service role key
   - Run the SQL schema from `database/schema.sql`

3. **Upstash Redis**
   - Create a free Redis instance at [Upstash](https://upstash.com/docs/redis/overall/pricing)
   - Get your REST URL and token

## Backend Deployment (Render)

### 1. Connect Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `NillionVault` repository

### 2. Configure Service
- **Name**: `nillionvault-backend`
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Plan**: Free

### 3. Environment Variables
Set these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://[your-supabase-url]
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_ANON_KEY=[your-anon-key]
NILLION_API_KEY=[your-nillion-api-key]
NILLION_RPC_URL=https://rpc-testnet.nillion.com
NILLION_NETWORK=testnet
DEV_ADDRESS_PRIVATE_KEY=[your-private-key]
UPSTASH_REDIS_REST_URL=https://[your-redis-url]
UPSTASH_REDIS_REST_TOKEN=[your-redis-token]
FRONTEND_URL=https://[your-vercel-url].vercel.app
```

### 4. Deploy Worker (Optional)
For background anchoring jobs, deploy a separate worker service:

- **Name**: `nillionvault-worker`
- **Environment**: `Worker`
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && node services/worker.js`
- **Plan**: Free

Use the same environment variables as the web service.

## Frontend Deployment (Vercel)

### 1. Connect Repository
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `NillionVault` repository

### 2. Configure Project
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 3. Environment Variables
Set these environment variables in Vercel:

```bash
NEXT_PUBLIC_API_URL=https://nillionvault-backend.onrender.com
NEXT_PUBLIC_NILLION_EXPLORER=https://testnet.nillion.explorers.guru
```

### 4. Deploy
Click "Deploy" and wait for the build to complete.

## Database Setup

### 1. Run Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the SQL to create tables and indexes

### 2. Configure RLS
The schema includes Row Level Security policies. Review and adjust as needed for your use case.

## Testing Deployment

### 1. Health Check
Visit your backend URL + `/health` to verify the service is running:
```
https://nillionvault-backend.onrender.com/health
```

### 2. Upload Test
1. Go to your frontend URL
2. Upload a test file or JSON data
3. Verify the upload completes successfully

### 3. Verification Test
1. Copy the proof hash from your upload
2. Go to `/verify` page
3. Paste the hash and verify it's found

### 4. Blockchain Check
1. Wait for anchoring (may take a few minutes)
2. Click "View on Explorer" to see the transaction
3. Verify the proof hash appears in the transaction data

## Monitoring

### Render Monitoring
- Check logs in Render dashboard
- Monitor resource usage
- Set up alerts for downtime

### Vercel Monitoring
- Use Vercel Analytics
- Monitor build logs
- Check function execution logs

### Database Monitoring
- Monitor Supabase usage
- Check query performance
- Review audit logs

## Free Tier Limits

### Render
- **Web Service**: 750 hours/month
- **Worker**: 750 hours/month
- **Database**: 1GB storage

### Vercel
- **Bandwidth**: 100GB/month
- **Function Executions**: 100GB-hours/month
- **Build Minutes**: 6000 minutes/month

### Supabase
- **Database**: 500MB storage
- **Bandwidth**: 2GB/month
- **API Requests**: Unlimited

### Upstash Redis
- **Storage**: 256MB
- **Commands**: 500K/month

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Verify all required env vars are set in deployment dashboard
   - Check for typos in variable names

2. **Database Connection Failed**
   - Verify DATABASE_URL is correct
   - Check Supabase project is not paused

3. **Nillion API Errors**
   - Verify API key is valid
   - Check you have testnet tokens from faucet

4. **Redis Connection Failed**
   - Verify UPSTASH_REDIS_REST_URL and token
   - Check Redis instance is active

5. **Frontend API Calls Failing**
   - Verify NEXT_PUBLIC_API_URL points to correct backend
   - Check CORS settings in backend

### Debug Commands

```bash
# Check backend logs
curl https://nillionvault-backend.onrender.com/health

# Test API endpoint
curl -X POST https://nillionvault-backend.onrender.com/api/verification/compute-hash \
  -H "Content-Type: application/json" \
  -d '{"data": {"test": "data"}, "type": "json"}'
```

## Scaling

When you outgrow free tiers:

1. **Upgrade Render Plan**: More resources, better performance
2. **Upgrade Supabase Plan**: More storage, better limits
3. **Add Load Balancing**: Multiple backend instances
4. **CDN**: Add Vercel Pro for better global performance
5. **Monitoring**: Add proper monitoring and alerting

## Security Considerations

1. **Environment Variables**: Never commit secrets to git
2. **API Keys**: Rotate keys regularly
3. **Database Access**: Use RLS policies appropriately
4. **HTTPS**: Always use HTTPS in production
5. **CORS**: Configure CORS properly for your domains
