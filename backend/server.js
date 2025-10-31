// VERY FIRST LINE - Ensures we know the file loaded
console.log('=== NillionVault Backend Starting ===');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'not set');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
console.log('📦 Loading environment variables...');
dotenv.config();

// Log startup attempt
console.log('🚀 Starting NillionVault Backend...');
console.log('📋 Environment check:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   - PORT: ${process.env.PORT || 'not set (default: 3001)'}`);
console.log(`   - BUILDER_PRIVATE_KEY: ${process.env.BUILDER_PRIVATE_KEY ? '✅ set' : '❌ missing'}`);
console.log(`   - NILCHAIN_URL: ${process.env.NILCHAIN_URL || '❌ missing'}`);
console.log(`   - NILAUTH_URL: ${process.env.NILAUTH_URL || '❌ missing'}`);
console.log(`   - NILDB_NODES: ${process.env.NILDB_NODES || '❌ missing'}`);
console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set (default: localhost:3000)'}`);

// Import routes (Nillion-only mode - auth/anchors removed)
const credentialRoutes = require('./routes/credentials');
const verificationRoutes = require('./routes/verification');

// Import middleware
const { errorHandler, requestLogger } = require('./middleware/errorHandler');
const { validateEnv } = require('./utils/envValidator');

// Validate required environment variables
console.log('\n🔍 Validating environment variables...');
try {
  validateEnv();
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  console.error('\n📝 Please set the following environment variables in Render:');
  console.error('   1. BUILDER_PRIVATE_KEY - Your Nillion private key (hex, 64 chars)');
  console.error('   2. NILCHAIN_URL - http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz');
  console.error('   3. NILAUTH_URL - https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz');
  console.error('   4. NILDB_NODES - https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network');
  console.error('   5. NILLION_NETWORK - testnet');
  console.error('   6. NODE_ENV - production');
  console.error('   7. PORT - 10000 (or Render will provide)');
  console.error('   8. FRONTEND_URL - https://nillionvault-frontend.onrender.com');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - Allow frontend and common origins
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://nillionvault-frontend.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
].filter(Boolean); // Remove undefined values

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin && origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Allow for now, but log it
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'NillionVault Backend API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      upload: '/api/credentials/upload',
      verify: '/api/credentials/verify',
      list: '/api/credentials/list',
      docs: 'https://github.com/hitman298/NillionVault'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes (Nillion-only mode)
app.use('/api/credentials', credentialRoutes);
app.use('/api/verification', verificationRoutes);

// Serve static files (for hash utility)
app.use('/tools', express.static(path.join(__dirname, '../tools')));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.originalUrl} not found` 
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server with error handling
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NillionVault Backend running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('✅ Server started successfully!');
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
