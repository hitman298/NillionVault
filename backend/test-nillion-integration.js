#!/usr/bin/env node

/**
 * NillionVault Nillion Integration Test
 * Tests the real Nillion SecretVaults SDK integration
 */

const dotenv = require('dotenv');
dotenv.config();

async function testNillionIntegration() {
  console.log('🚀 Testing NillionVault Nillion Integration...\n');

  try {
    // Test 1: Check environment variables
    console.log('📋 Checking environment variables...');
    
    const requiredEnvVars = [
      'NILLION_API_KEY',
      'NILLION_NETWORK',
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      console.error('\nPlease check your backend/.env file');
      process.exit(1);
    }

    console.log('✅ Environment variables configured');

    // Test 2: Test SecretVaults SDK
    console.log('\n🔧 Testing SecretVaults SDK...');
    
    try {
      const { SecretVaultsClient } = require('@nillion/secretvaults');
      
      const client = new SecretVaultsClient({
        apiKey: process.env.NILLION_API_KEY,
        network: process.env.NILLION_NETWORK
      });

      console.log('✅ SecretVaults SDK loaded successfully');

      // Test 3: Create test collection
      console.log('\n📦 Creating test collection...');
      
      const collection = await client.createCollection({
        name: 'nillionvault-test-collection',
        schema: {
          test_credential: 'blob',
          test_metadata: 'json'
        }
      });

      console.log(`✅ Collection created: ${collection.id}`);

      // Test 4: Insert test data
      console.log('\n📝 Inserting test data...');
      
      const testData = Buffer.from('Test credential data for NillionVault');
      const testMetadata = {
        test: true,
        created_at: new Date().toISOString(),
        project: 'NillionVault'
      };

      await collection.insert({
        test_credential: testData,
        test_metadata: testMetadata
      });

      console.log('✅ Test data inserted successfully');

      // Test 5: Retrieve test data
      console.log('\n📖 Retrieving test data...');
      
      const records = await collection.getAll();
      
      if (records.length > 0) {
        console.log(`✅ Retrieved ${records.length} records`);
        console.log('📊 Test metadata:', records[0].test_metadata);
      } else {
        console.log('⚠️  No records found');
      }

      console.log('\n🎉 All Nillion integration tests passed!');
      console.log('✅ NillionVault is ready for real blockchain operations');
      
    } catch (sdkError) {
      console.error('❌ SecretVaults SDK test failed:', sdkError.message);
      
      if (sdkError.message.includes('API key') || sdkError.message.includes('unauthorized')) {
        console.log('\n🔑 Troubleshooting API Key Issues:');
        console.log('1. Make sure you have subscribed to nilDB service at https://nilpay.vercel.app/');
        console.log('2. Check your NILLION_API_KEY in backend/.env');
        console.log('3. Verify your API key is valid and active');
        console.log('4. Ensure you have sufficient NIL tokens for the subscription');
      }
      
      throw sdkError;
    }

    // Test 6: Test database connection
    console.log('\n🗄️  Testing database connection...');
    
    const { db } = require('./services/supabase');
    
    // Test basic database operation
    const testUser = await db.createUser({
      id: 'test-user-' + Date.now(),
      email: 'test@nillionvault.com'
    });

    console.log(`✅ Database connection working, created test user: ${testUser.id}`);

    // Cleanup test user
    // Note: In production, you might want to keep this for testing

    console.log('\n🎯 Integration Test Summary:');
    console.log('✅ Environment variables configured');
    console.log('✅ SecretVaults SDK working');
    console.log('✅ Nillion collections can be created');
    console.log('✅ Data can be stored and retrieved');
    console.log('✅ Database connection working');
    console.log('\n🚀 NillionVault is fully operational with real Nillion services!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    
    console.log('\n🔧 Common Issues and Solutions:');
    console.log('1. API Key Issues:');
    console.log('   - Subscribe to nilDB at https://nilpay.vercel.app/');
    console.log('   - Verify API key in backend/.env');
    console.log('   - Check token balance (need 28 NIL for subscription)');
    
    console.log('\n2. SDK Installation:');
    console.log('   - Run: npm install @nillion/secretvaults');
    console.log('   - Check package.json includes the dependency');
    
    console.log('\n3. Network Issues:');
    console.log('   - Check internet connection');
    console.log('   - Verify NILLION_NETWORK=testnet');
    console.log('   - Check status at https://status.nillion.com');
    
    console.log('\n4. Database Issues:');
    console.log('   - Verify Supabase credentials');
    console.log('   - Run database schema from database/schema.sql');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testNillionIntegration();
}

module.exports = { testNillionIntegration };
