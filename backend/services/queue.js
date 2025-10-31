const { logger } = require('../middleware/errorHandler');

/**
 * Queue Service - Simplified for Nillion-only operation
 * No Redis/Upstash dependency
 */
class QueueService {
  constructor() {
    logger.info('Queue service initialized (Nillion-only mode)');
  }


  /**
   * Enqueue an anchor job (no-op in Nillion-only mode)
   */
  async enqueueAnchorJob(jobData) {
    logger.info('Anchor job skipped (Nillion-only mode)', { 
      credentialId: jobData.credentialId 
    });
    return { id: 'mock-job-id', data: jobData };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0,
      status: 'disabled'
    };
  }

  /**
   * Get job status (no-op in Nillion-only mode)
   */
  async getJobStatus(jobId) {
    return { status: 'not_found' };
  }

  /**
   * Retry failed job (no-op in Nillion-only mode)
   */
  async retryJob(jobId) {
    logger.info('Job retry skipped (Nillion-only mode)', { jobId });
  }

  /**
   * Clean up jobs (no-op in Nillion-only mode)
   */
  async cleanJobs(olderThanHours = 24) {
    logger.info('Job cleanup skipped (Nillion-only mode)');
  }

  /**
   * Pause the queue (no-op in Nillion-only mode)
   */
  async pauseQueue() {
    logger.info('Queue pause skipped (Nillion-only mode)');
  }

  /**
   * Resume the queue (no-op in Nillion-only mode)
   */
  async resumeQueue() {
    logger.info('Queue resume skipped (Nillion-only mode)');
  }

  /**
   * Graceful shutdown (no-op in Nillion-only mode)
   */
  async shutdown() {
    logger.info('Queue service shutdown (Nillion-only mode)');
  }
}

// Create singleton instance
const queueService = new QueueService();

module.exports = { queueService };
