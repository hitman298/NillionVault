# NillionVault Deployment Guide

## Quick Deployment Options

### Option 1: Vercel + Render (Recommended)

**Frontend (Vercel)**
1. Connect GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/public`
   - Install Command: `cd frontend && npm install`

**Backend (Render)**
1. Connect GitHub repository to Render
2. Configure service:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment Variables: Set all variables from `backend/.env`

### Option 2: Railway (Full Stack)

1. Connect GitHub repository to Railway
2. Configure services:
   - Frontend service: `cd frontend && npm start`
   - Backend service: `cd backend && npm start`
3. Set environment variables in Railway dashboard

### Option 3: Docker (Self-hosted)

```bash
# Build and run
docker-compose -f deploy/docker-compose.yml up --build

# Access services
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

## Environment Variables

### Backend (.env)

```env
# Nillion Configuration
BUILDER_PRIVATE_KEY=your_private_key_here
NILCHAIN_URL=http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
NILAUTH_URL=https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz
NILDB_NODES=https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network

# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:port/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Queue (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Server Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

## Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note your project URL and API keys

2. **Run Database Schema**
   ```sql
   -- Copy and run the contents of database/schema.sql
   -- in your Supabase SQL editor
   ```

3. **Configure Row Level Security**
   - Enable RLS on all tables
   - Set up policies for your use case

## Nillion Network Setup

### 1. Create Nillion Wallet
- Visit [Nillion Testnet](https://testnet.nillion.network)
- Create new wallet
- Fund with testnet NIL tokens

### 2. Subscribe to nilDB
- Go to [nilPay](https://nilpay.nillion.network)
- Subscribe to nilDB service (28 NIL/month)
- Save your private key for authentication

### 3. Configure Builder
- Use your private key as `BUILDER_PRIVATE_KEY`
- The system will auto-register as a builder

## Domain Configuration

### Custom Domain Setup

1. **Frontend Domain**
   - Add custom domain in Vercel/Netlify
   - Configure DNS records
   - Enable HTTPS

2. **Backend Domain**
   - Configure custom domain in Render/Railway
   - Update `FRONTEND_URL` environment variable

3. **CORS Configuration**
   - Update CORS settings in backend
   - Allow your frontend domain

## Monitoring & Logging

### Application Monitoring

1. **Health Checks**
   - Backend: `GET /health`
   - Frontend: Basic connectivity test

2. **Error Tracking**
   - Configure error logging
   - Set up alerts for critical errors

3. **Performance Monitoring**
   - Monitor API response times
   - Track database query performance
   - Monitor blockchain transaction success rates

## Security Checklist

- ✅ HTTPS enabled on all domains
- ✅ Environment variables secured
- ✅ CORS properly configured
- ✅ Database RLS policies enabled
- ✅ Input validation implemented
- ✅ Rate limiting configured
- ✅ Error messages sanitized

## Troubleshooting

### Common Issues

1. **Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure proper JSON formatting

2. **Database Connection**
   - Verify Supabase credentials
   - Check network connectivity
   - Validate schema installation

3. **Nillion Integration**
   - Verify private key format
   - Check testnet connectivity
   - Ensure nilDB subscription is active

4. **CORS Issues**
   - Update `FRONTEND_URL` environment variable
   - Check CORS configuration in backend
   - Verify domain names match exactly

### Support Resources

- [Nillion Documentation](https://docs.nillion.network)
- [Supabase Documentation](https://supabase.com/docs)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## Post-Deployment

### Testing Checklist

1. **Upload Test**
   - Upload a JSON document
   - Verify hash generation
   - Check database storage

2. **Verification Test**
   - Use generated hash for verification
   - Verify response accuracy
   - Test error handling

3. **Performance Test**
   - Test with multiple concurrent uploads
   - Verify response times
   - Check memory usage

### Maintenance

1. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Update environment variables as needed

2. **Backup Strategy**
   - Regular database backups
   - Environment variable backups
   - Code repository backups

3. **Monitoring**
   - Set up uptime monitoring
   - Configure error alerts
   - Monitor resource usage
