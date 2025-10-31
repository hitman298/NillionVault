/**
 * Environment variable validation
 * Ensures all required environment variables are present
 */

function validateEnv() {
  // Only require Nillion-related environment variables (Supabase/Redis removed)
  const required = [
    'BUILDER_PRIVATE_KEY',
    'NILCHAIN_URL',
    'NILAUTH_URL',
    'NILDB_NODES'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See backend/env.example for reference.');
    console.error('\n💡 For NillionDB integration, you need:');
    console.error('   - BUILDER_PRIVATE_KEY (from Nillion UI)');
    console.error('   - NILCHAIN_URL (testnet URL)');
    console.error('   - NILAUTH_URL (testnet URL)');
    console.error('   - NILDB_NODES (comma-separated testnet nodes)');
    process.exit(1);
  }

  // Validate URLs (Nillion only - no Supabase/Redis)
  try {
    new URL(process.env.NILCHAIN_URL);
    new URL(process.env.NILAUTH_URL);
    
    // Validate NILDB_NODES format
    const nodes = process.env.NILDB_NODES.split(',');
    if (nodes.length < 1) {
      throw new Error('NILDB_NODES must contain at least one node URL');
    }
    nodes.forEach(node => new URL(node.trim()));
    
  } catch (error) {
    console.error('❌ Invalid URL in environment variables:', error.message);
    process.exit(1);
  }

  // Validate private key format
  if (process.env.BUILDER_PRIVATE_KEY && !/^[a-fA-F0-9]{64}$/.test(process.env.BUILDER_PRIVATE_KEY)) {
    console.error('❌ BUILDER_PRIVATE_KEY must be a 64-character hexadecimal string');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
  console.log('🔐 NillionDB integration: ENABLED (testnet only)');
}

module.exports = { validateEnv };
