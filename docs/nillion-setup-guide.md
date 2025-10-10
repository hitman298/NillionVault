# Nillion Service Setup Guide

This guide will help you set up all the necessary Nillion services to make NillionVault work with real blockchain infrastructure.

## Step 1: Create Nillion Wallet & Get Tokens

### 1.1 Create Nillion Wallet
1. Go to: https://docs.nillion.com/community/guides/nillion-wallet
2. Follow the instructions to create your wallet
3. **Save your wallet seed phrase securely** - you'll need this for transactions

### 1.2 Get Testnet NIL Tokens
1. Go to: https://faucet.testnet.nillion.com/
2. Enter your wallet address
3. Request tokens (you get 0.1 NIL every 24 hours)
4. **Note**: You need 28 NIL tokens to subscribe to nilDB service

### 1.3 Accumulate Enough Tokens
Since the faucet only gives 0.1 NIL per day, you'll need to:
- **Wait ~280 days** (0.1 × 280 = 28 NIL), OR
- **Contact Nillion team** for additional testnet tokens for development
- **Join Nucleus Builders Program**: https://nucleus.nillion.com for potential grants

## Step 2: Subscribe to nilDB Service

### 2.1 Subscribe via nilPay
1. Go to: https://nilpay.vercel.app/
2. Connect your Nillion wallet
3. Subscribe to **nilDB** service (28 NIL tokens/month)
4. You'll receive a **Nillion API Key** after successful payment

### 2.2 Alternative: Contact Nillion Team
If you don't have enough tokens, reach out to:
- **Community Support**: https://docs.nillion.com/community-and-support
- **Nucleus Builders Program**: https://nucleus.nillion.com
- Explain you're building NillionVault and need testnet access

## Step 3: Configure Your Environment

### 3.1 Update Backend Environment
Edit your `backend/.env` file with real credentials:

```bash
# Nillion Configuration (REAL VALUES)
NILLION_API_KEY=your_actual_nillion_api_key_here
NILLION_RPC_URL=https://rpc-testnet.nillion.com
NILLION_NETWORK=testnet

# For nilChain transactions, you'll need a private key
# This should be from your Nillion wallet
DEV_ADDRESS_PRIVATE_KEY=your_wallet_private_key_here

# Other services remain the same
DATABASE_URL=your_supabase_postgres_url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### 3.2 Frontend Environment
Your `frontend/.env.local` should point to your deployed backend:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_NILLION_EXPLORER=https://testnet.nillion.explorers.guru
```

## Step 4: Update NillionVault Code

### 4.1 Update Nillion Service
The current Nillion service needs to be updated to use the real Secretvaults SDK:

```typescript
// backend/services/nillion.ts - Updated for real SDK
import { SecretVaultsClient } from '@nillion/secretvaults';

class NillionService {
  constructor() {
    this.client = new SecretVaultsClient({
      apiKey: process.env.NILLION_API_KEY,
      network: 'testnet',
      // SDK will automatically use 3 nilDB nodes
    });
  }

  async storeCredential(credentialId: string, data: Buffer, metadata: any) {
    // Use real Secretvaults SDK instead of mock implementation
    const collection = await this.client.createCollection({
      name: `credential-${credentialId}`,
      schema: {
        credential_data: 'blob',
        metadata: 'json'
      }
    });

    await collection.insert({
      credential_data: data,
      metadata: metadata
    });

    return collection.id;
  }
}
```

### 4.2 Install Real SDK
Update `backend/package.json`:

```json
{
  "dependencies": {
    "@nillion/secretvaults": "^1.0.0"
  }
}
```

## Step 5: Test the Integration

### 5.1 Test nilDB Connection
Create a test script:

```typescript
// backend/test-nillion.js
const { SecretVaultsClient } = require('@nillion/secretvaults');

async function testNillion() {
  const client = new SecretVaultsClient({
    apiKey: process.env.NILLION_API_KEY,
    network: 'testnet'
  });

  try {
    // Test creating a collection
    const collection = await client.createCollection({
      name: 'test-collection',
      schema: {
        test_data: 'string'
      }
    });

    console.log('✅ Nillion connection successful!');
    console.log('Collection ID:', collection.id);
  } catch (error) {
    console.error('❌ Nillion connection failed:', error);
  }
}

testNillion();
```

### 5.2 Test nilChain Transactions
The anchor service should work with real nilChain once you have:
- Valid Nillion wallet private key
- Sufficient NIL tokens for gas fees
- Real RPC endpoint

## Troubleshooting

### Common Issues

1. **"Insufficient NIL tokens"**
   - Wait for more faucet tokens or contact Nillion team
   - Check your wallet balance

2. **"Invalid API Key"**
   - Verify you've subscribed to nilDB service
   - Check API key is correctly set in environment

3. **"Network connection failed"**
   - Verify network endpoints are correct
   - Check if testnet is operational at https://status.nillion.com

### Getting Help

- **Community Support**: https://docs.nillion.com/community-and-support
- **Nucleus Builders Program**: https://nucleus.nillion.com
- **GitHub Issues**: For technical problems with the SDK

## Next Steps

1. **Get testnet tokens** (contact Nillion if needed)
2. **Subscribe to nilDB** service
3. **Update environment variables** with real credentials
4. **Install real Secretvaults SDK**
5. **Test the integration**
6. **Deploy and verify** on testnet

The project is already built to work with real Nillion services - you just need to replace the mock implementations with real API calls using your subscription!
