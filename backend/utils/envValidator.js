/**
 * Environment variable validation
 * Ensures all required environment variables are present
 */

function validateEnv() {
  const required = [
    'DATABASE_URL',
    'SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'NILLION_API_KEY',
    'NILLION_RPC_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See backend/env.example for reference.');
    process.exit(1);
  }

  // Validate URLs
  try {
    new URL(process.env.SUPABASE_URL);
    new URL(process.env.NILLION_RPC_URL);
    new URL(process.env.UPSTASH_REDIS_REST_URL);
  } catch (error) {
    console.error('❌ Invalid URL in environment variables:', error.message);
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

module.exports = { validateEnv };
