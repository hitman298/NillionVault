const express = require('express');
const Joi = require('joi');

const { db } = require('../services/supabase');
const { queueService } = require('../services/queue');
const { anchorService } = require('../services/anchor');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation schemas
const retrySchema = Joi.object({
  anchorId: Joi.string().uuid().required()
});

/**
 * GET /api/anchors/status
 * Get queue and anchoring status
 */
router.get('/status', async (req, res, next) => {
  try {
    const queueStats = await queueService.getQueueStats();
    const anchorHealth = await anchorService.healthCheck();
    
    res.json({
      success: true,
      status: {
        queue: queueStats,
        anchorService: anchorHealth,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anchors/:id
 * Get anchor details by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Try to get anchor by ID first
    let anchor = await db.getAnchorById(id);
    
    if (!anchor) {
      throw new NotFoundError('Anchor');
    }

    // Get explorer URL
    const explorerUrl = await anchorService.getExplorerUrl(anchor.tx_hash);

    res.json({
      success: true,
      anchor: {
        ...anchor,
        explorer_url: explorerUrl
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anchors/tx/:txHash
 * Get anchor details by transaction hash
 */
router.get('/tx/:txHash', async (req, res, next) => {
  try {
    const { txHash } = req.params;
    
    const anchor = await db.getAnchorByTxHash(txHash);
    if (!anchor) {
      throw new NotFoundError('Anchor');
    }

    // Get explorer URL
    const explorerUrl = await anchorService.getExplorerUrl(txHash);

    res.json({
      success: true,
      anchor: {
        ...anchor,
        explorer_url: explorerUrl
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anchors/pending
 * Get all pending anchors
 */
router.get('/pending', async (req, res, next) => {
  try {
    const pendingAnchors = await db.getPendingAnchors();
    
    res.json({
      success: true,
      anchors: pendingAnchors,
      count: pendingAnchors.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/anchors/retry
 * Retry a failed anchor job
 */
router.post('/retry', async (req, res, next) => {
  try {
    const { error, value } = retrySchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { anchorId } = value;

    const anchor = await db.getAnchorById(anchorId);
    if (!anchor) {
      throw new NotFoundError('Anchor');
    }

    if (anchor.status !== 'failed') {
      throw new ValidationError('Can only retry failed anchors');
    }

    // Get the credential
    const credential = await db.getCredentialById(anchor.credential_id);
    if (!credential) {
      throw new NotFoundError('Credential');
    }

    // Enqueue new anchor job
    await queueService.enqueueAnchorJob({
      credentialId: credential.id,
      proofHash: credential.proof_hash,
      userId: credential.user_id
    });

    // Create audit log
    await db.createAuditLog({
      entity_type: 'anchor',
      entity_id: anchorId,
      action: 'retry',
      actor: 'system',
      metadata: {
        credentialId: credential.id,
        proofHash: credential.proof_hash
      }
    });

    res.json({
      success: true,
      message: 'Anchor retry job enqueued',
      anchorId,
      credentialId: credential.id
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anchors/verify/:txHash
 * Verify an anchor transaction on the blockchain
 */
router.get('/verify/:txHash', async (req, res, next) => {
  try {
    const { txHash } = req.params;

    // Get anchor from database
    const anchor = await db.getAnchorByTxHash(txHash);
    if (!anchor) {
      throw new NotFoundError('Anchor');
    }

    // Get transaction receipt from blockchain
    let blockchainData = null;
    try {
      blockchainData = await anchorService.getTransactionReceipt(txHash);
    } catch (blockchainError) {
      // Transaction might not be confirmed yet
      blockchainData = { error: blockchainError.message };
    }

    // Get explorer URL
    const explorerUrl = await anchorService.getExplorerUrl(txHash);

    res.json({
      success: true,
      verification: {
        database: {
          exists: true,
          status: anchor.status,
          blockHeight: anchor.block_height,
          txTime: anchor.tx_time,
          createdAt: anchor.created_at
        },
        blockchain: blockchainData,
        explorer_url: explorerUrl,
        verified: blockchainData && !blockchainData.error && blockchainData.blockNumber
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/anchors/stats
 * Get anchoring statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    // This would require additional database queries
    // For now, return basic stats from pending anchors
    const pendingAnchors = await db.getPendingAnchors();
    
    res.json({
      success: true,
      stats: {
        pending: pendingAnchors.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
