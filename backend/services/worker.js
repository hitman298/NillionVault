#!/usr/bin/env node

/**
 * NillionVault Background Worker
 * Processes anchoring jobs from the Redis queue
 */

const dotenv = require('dotenv');
dotenv.config();

const { queueService } = require('./queue');
const { logger } = require('../middleware/errorHandler');

async function startWorker() {
  try {
    logger.info('Starting NillionVault worker...');
    
    // The worker is automatically started when queueService is imported
    // This file can be used to run the worker as a separate process
    
    // Keep the process alive
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down worker gracefully...');
      await queueService.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down worker gracefully...');
      await queueService.shutdown();
      process.exit(0);
    });

    // Keep alive
    setInterval(() => {
      logger.debug('Worker heartbeat');
    }, 60000); // Log every minute

  } catch (error) {
    logger.error('Failed to start worker', { error: error.message });
    process.exit(1);
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker();
}

module.exports = { startWorker };
