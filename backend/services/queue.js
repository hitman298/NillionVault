const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { logger } = require('../middleware/errorHandler');

/**
 * Redis Queue Service for background anchoring jobs
 * Temporarily disabled due to Upstash connection issues
 */
class QueueService {
  constructor() {
    // Temporarily disable Redis connection due to Upstash issues
    this.redis = null;
    this.anchorQueue = null;
    this.anchorWorker = null;
    
    logger.info('Queue service initialized in mock mode (Redis disabled)');
  }

  /**
   * Initialize the anchor worker
   */
  initializeWorker() {
    this.anchorWorker = new Worker(
      'anchor-queue',
      async (job) => {
        const { credentialId, proofHash, userId } = job.data;
        
        logger.info('Processing anchor job', { 
          jobId: job.id, 
          credentialId, 
          proofHash 
        });

        try {
          // Import anchor service here to avoid circular dependencies
          const { anchorService } = require('./anchor');
          
          // Process the anchoring
          const result = await anchorService.anchorCredential({
            credentialId,
            proofHash,
            userId
          });

          logger.info('Anchor job completed', { 
            jobId: job.id, 
            credentialId,
            txHash: result.txHash 
          });

          return result;

        } catch (error) {
          logger.error('Anchor job failed', { 
            jobId: job.id, 
            credentialId,
            error: error.message 
          });
          throw error;
        }
      },
      {
        connection: this.redis,
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    // Handle worker events
    this.anchorWorker.on('completed', (job, result) => {
      logger.info('Worker job completed', { 
        jobId: job.id, 
        result: result?.txHash 
      });
    });

    this.anchorWorker.on('failed', (job, err) => {
      logger.error('Worker job failed', { 
        jobId: job.id, 
        error: err.message,
        attempts: job.attemptsMade 
      });
    });

    this.anchorWorker.on('error', (err) => {
      logger.error('Worker error', { error: err.message });
    });
  }

  /**
   * Enqueue an anchor job
   */
  async enqueueAnchorJob(jobData) {
    try {
      if (!this.anchorQueue) {
        logger.info('Queue disabled - skipping anchor job', { 
          credentialId: jobData.credentialId 
        });
        return { id: 'mock-job-id', data: jobData };
      }

      const job = await this.anchorQueue.add('anchor-credential', jobData, {
        priority: 1, // Higher priority for newer jobs
        delay: 1000, // 1 second delay to allow credential to be fully processed
      });

      logger.info('Anchor job enqueued', { 
        jobId: job.id, 
        credentialId: jobData.credentialId 
      });

      return job;

    } catch (error) {
      logger.error('Failed to enqueue anchor job', { 
        error: error.message,
        jobData 
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    try {
      if (!this.anchorQueue) {
        return {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0,
          status: 'disabled'
        };
      }

      const waiting = await this.anchorQueue.getWaiting();
      const active = await this.anchorQueue.getActive();
      const completed = await this.anchorQueue.getCompleted();
      const failed = await this.anchorQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      };

    } catch (error) {
      logger.error('Failed to get queue stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    try {
      const job = await this.anchorQueue.getJob(jobId);
      
      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      
      return {
        id: job.id,
        status: state,
        progress: job.progress,
        data: job.data,
        result: job.returnvalue,
        error: job.failedReason,
        createdAt: new Date(job.timestamp),
        processedAt: job.processedOn ? new Date(job.processedOn) : null,
        finishedAt: job.finishedOn ? new Date(job.finishedOn) : null
      };

    } catch (error) {
      logger.error('Failed to get job status', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId) {
    try {
      const job = await this.anchorQueue.getJob(jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }

      await job.retry();
      
      logger.info('Job retried', { jobId });
      
    } catch (error) {
      logger.error('Failed to retry job', { jobId, error: error.message });
      throw error;
    }
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanJobs(olderThanHours = 24) {
    try {
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      await this.anchorQueue.clean(cutoffTime, 100, 'completed');
      await this.anchorQueue.clean(cutoffTime, 100, 'failed');
      
      logger.info('Jobs cleaned up', { cutoffTime: new Date(cutoffTime) });
      
    } catch (error) {
      logger.error('Failed to clean jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Pause the queue
   */
  async pauseQueue() {
    try {
      await this.anchorQueue.pause();
      logger.info('Queue paused');
    } catch (error) {
      logger.error('Failed to pause queue', { error: error.message });
      throw error;
    }
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    try {
      await this.anchorQueue.resume();
      logger.info('Queue resumed');
    } catch (error) {
      logger.error('Failed to resume queue', { error: error.message });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Shutting down queue service...');
      
      await this.anchorWorker.close();
      await this.anchorQueue.close();
      await this.redis.disconnect();
      
      logger.info('Queue service shut down complete');
    } catch (error) {
      logger.error('Error during queue service shutdown', { error: error.message });
    }
  }
}

// Create singleton instance
const queueService = new QueueService();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await queueService.shutdown();
});

process.on('SIGINT', async () => {
  await queueService.shutdown();
});

module.exports = { queueService };
