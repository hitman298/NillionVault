#!/bin/bash

# NillionVault Nillion Service Setup Script
# This script helps set up the real Nillion services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if we have enough NIL tokens
check_nil_balance() {
    print_header "Checking NIL Token Balance"
    
    if [ -z "$NILLION_WALLET_ADDRESS" ]; then
        print_warning "NILLION_WALLET_ADDRESS not set. Please set it in your environment:"
        echo "export NILLION_WALLET_ADDRESS=your_wallet_address_here"
        echo ""
        print_status "You can get your wallet address from your Nillion wallet"
        return 1
    fi
    
    print_status "Checking balance for wallet: $NILLION_WALLET_ADDRESS"
    
    # This would need to be implemented with actual nilChain RPC calls
    print_warning "Manual check required:"
    echo "1. Go to https://testnet.nillion.explorers.guru"
    echo "2. Search for your wallet address: $NILLION_WALLET_ADDRESS"
    echo "3. Check your NIL token balance"
    echo "4. You need at least 28 NIL tokens to subscribe to nilDB service"
    echo ""
    
    read -p "Do you have at least 28 NIL tokens? (y/n): " has_tokens
    if [ "$has_tokens" != "y" ]; then
        print_error "You need 28 NIL tokens to subscribe to nilDB service"
        print_status "Options to get more tokens:"
        echo "1. Wait for faucet (0.1 NIL per day = ~280 days)"
        echo "2. Contact Nillion team for additional testnet tokens"
        echo "3. Join Nucleus Builders Program: https://nucleus.nillion.com"
        return 1
    fi
    
    return 0
}

# Install real Secretvaults SDK
install_secretvaults_sdk() {
    print_header "Installing Real Secretvaults SDK"
    
    cd backend
    
    print_status "Installing @nillion/secretvaults package..."
    npm install @nillion/secretvaults
    
    print_success "Secretvaults SDK installed successfully"
    
    cd ..
}

# Update Nillion service to use real SDK
update_nillion_service() {
    print_header "Updating Nillion Service"
    
    print_status "Updating backend/services/nillion.js to use real SDK..."
    
    # Uncomment the real SDK import
    sed -i.bak 's|// const { SecretVaultsClient } = require|const { SecretVaultsClient } = require|g' backend/services/nillion.js
    
    # Uncomment the real client initialization
    sed -i.bak 's|//       const { SecretVaultsClient } = require|      const { SecretVaultsClient } = require|g' backend/services/nillion.js
    sed -i.bak 's|//       this.client = new SecretVaultsClient|      this.client = new SecretVaultsClient|g' backend/services/nillion.js
    sed -i.bak 's|//       });|      });|g' backend/services/nillion.js
    
    print_success "Nillion service updated to use real SDK"
}

# Test Nillion connection
test_nillion_connection() {
    print_header "Testing Nillion Connection"
    
    cd backend
    
    print_status "Creating test script..."
    
    cat > test-nillion.js << 'EOF'
const dotenv = require('dotenv');
dotenv.config();

async function testNillion() {
  try {
    const { SecretVaultsClient } = require('@nillion/secretvaults');
    
    console.log('🔧 Initializing Secretvaults client...');
    const client = new SecretVaultsClient({
      apiKey: process.env.NILLION_API_KEY,
      network: 'testnet'
    });

    console.log('📊 Testing collection creation...');
    const collection = await client.createCollection({
      name: 'test-nillionvault-collection',
      schema: {
        test_data: 'string',
        test_number: 'number'
      }
    });

    console.log('✅ Nillion connection successful!');
    console.log('📦 Collection ID:', collection.id);
    
    console.log('📝 Testing data insertion...');
    await collection.insert({
      test_data: 'Hello from NillionVault!',
      test_number: 42
    });
    
    console.log('✅ Data insertion successful!');
    console.log('🎉 NillionVault is ready for real blockchain operations!');
    
  } catch (error) {
    console.error('❌ Nillion connection failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔑 Troubleshooting:');
      console.log('1. Make sure you have subscribed to nilDB service at https://nilpay.vercel.app/');
      console.log('2. Check your NILLION_API_KEY in backend/.env');
      console.log('3. Verify your API key is valid and active');
    }
    
    process.exit(1);
  }
}

testNillion();
EOF

    print_status "Running Nillion connection test..."
    
    if node test-nillion.js; then
        print_success "Nillion connection test passed!"
        rm test-nillion.js
    else
        print_error "Nillion connection test failed"
        print_status "Test script saved as test-nillion.js for debugging"
        return 1
    fi
    
    cd ..
}

# Update environment file
update_environment() {
    print_header "Environment Configuration"
    
    print_status "Checking backend/.env file..."
    
    if [ ! -f "backend/.env" ]; then
        print_error "backend/.env file not found"
        print_status "Please run the main setup script first: ./scripts/setup.sh"
        return 1
    fi
    
    print_warning "Please update your backend/.env file with real Nillion credentials:"
    echo ""
    echo "# Nillion Configuration (REAL VALUES)"
    echo "NILLION_API_KEY=your_actual_nillion_api_key_here"
    echo "NILLION_RPC_URL=https://rpc-testnet.nillion.com"
    echo "NILLION_NETWORK=testnet"
    echo "DEV_ADDRESS_PRIVATE_KEY=your_wallet_private_key_here"
    echo ""
    print_status "Get your API key from: https://nilpay.vercel.app/"
    print_status "Subscribe to nilDB service (28 NIL tokens/month)"
    
    read -p "Press Enter when you have updated the .env file..."
}

# Main setup function
main() {
    print_header "NillionVault Nillion Service Setup"
    
    echo "This script will help you set up real Nillion services for NillionVault."
    echo "You'll need:"
    echo "1. A Nillion wallet with at least 28 NIL tokens"
    echo "2. A nilDB service subscription"
    echo "3. A valid Nillion API key"
    echo ""
    
    read -p "Do you want to continue? (y/n): " continue_setup
    if [ "$continue_setup" != "y" ]; then
        print_status "Setup cancelled"
        exit 0
    fi
    
    # Check prerequisites
    if ! check_nil_balance; then
        print_error "Setup cannot continue without sufficient NIL tokens"
        exit 1
    fi
    
    # Update environment
    update_environment
    
    # Install SDK
    install_secretvaults_sdk
    
    # Update service
    update_nillion_service
    
    # Test connection
    if test_nillion_connection; then
        print_header "Setup Complete!"
        print_success "NillionVault is now configured with real Nillion services!"
        echo ""
        echo "Next steps:"
        echo "1. Start the backend: cd backend && npm run dev"
        echo "2. Start the frontend: cd frontend && npm run dev"
        echo "3. Upload a credential and verify it works with real blockchain"
        echo "4. Check transactions on: https://testnet.nillion.explorers.guru"
    else
        print_error "Setup failed. Please check the error messages above."
        exit 1
    fi
}

# Run main function
main
