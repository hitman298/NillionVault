#!/bin/bash

# NillionVault Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up NillionVault..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
}

# Install backend dependencies
setup_backend() {
    print_status "Setting up backend..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in backend directory"
        exit 1
    fi
    
    npm install
    print_success "Backend dependencies installed"
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    print_status "Setting up frontend..."
    cd frontend
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in frontend directory"
        exit 1
    fi
    
    npm install
    print_success "Frontend dependencies installed"
    cd ..
}

# Create environment files
setup_env() {
    print_status "Setting up environment files..."
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/env.example" ]; then
            cp backend/env.example backend/.env
            print_success "Created backend/.env from example"
            print_warning "Please edit backend/.env with your actual credentials"
        else
            print_error "backend/env.example not found"
        fi
    else
        print_warning "backend/.env already exists, skipping"
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env.local" ]; then
        if [ -f "frontend/env.example" ]; then
            cp frontend/env.example frontend/.env.local
            print_success "Created frontend/.env.local from example"
            print_warning "Please edit frontend/.env.local with your actual API URL"
        else
            print_error "frontend/env.example not found"
        fi
    else
        print_warning "frontend/.env.local already exists, skipping"
    fi
}

# Make hash tool executable
setup_tools() {
    print_status "Setting up tools..."
    
    if [ -f "tools/hash.js" ]; then
        chmod +x tools/hash.js
        print_success "Made hash.js executable"
    else
        print_error "tools/hash.js not found"
    fi
}

# Test hash tool
test_hash_tool() {
    print_status "Testing hash tool..."
    
    if [ -f "fixtures/sample-credentials.json" ]; then
        # Create a test JSON file
        echo '{"test": "data", "number": 123}' > /tmp/test.json
        
        # Test the hash tool
        if node tools/hash.js /tmp/test.json > /dev/null 2>&1; then
            print_success "Hash tool is working correctly"
        else
            print_error "Hash tool test failed"
        fi
        
        # Clean up
        rm -f /tmp/test.json
    else
        print_warning "fixtures/sample-credentials.json not found, skipping hash tool test"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Set up your accounts:"
    echo "   - Nillion Devnet: https://docs.nillion.com/build/private-storage/quickstart"
    echo "   - Supabase: https://supabase.com/pricing"
    echo "   - Upstash Redis: https://upstash.com/docs/redis/overall/pricing"
    echo ""
    echo "2. Configure environment variables:"
    echo "   - Edit backend/.env with your API keys and database URLs"
    echo "   - Edit frontend/.env.local with your backend URL"
    echo ""
    echo "3. Set up the database:"
    echo "   - Run the SQL schema from database/schema.sql in your Supabase project"
    echo ""
    echo "4. Start the development servers:"
    echo "   - Backend: cd backend && npm run dev"
    echo "   - Frontend: cd frontend && npm run dev"
    echo ""
    echo "5. Test the system:"
    echo "   - Upload a credential at http://localhost:3000"
    echo "   - Verify it at http://localhost:3000/verify"
    echo ""
    echo "For deployment instructions, see deploy/README.md"
}

# Main setup function
main() {
    echo "Starting NillionVault setup..."
    echo ""
    
    check_node
    check_npm
    setup_backend
    setup_frontend
    setup_env
    setup_tools
    test_hash_tool
    show_next_steps
}

# Run main function
main
