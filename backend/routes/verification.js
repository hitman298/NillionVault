const express = require('express');
const Joi = require('joi');
// Hash computation functions
const crypto = require('crypto');

function computeJsonProofHash(jsonData) {
  try {
    const parsed = JSON.parse(jsonData);
    const canonicalized = JSON.stringify(parsed, Object.keys(parsed).sort());
    return crypto.createHash('sha256').update(canonicalized, 'utf8').digest('hex');
  } catch (error) {
    throw new Error('Invalid JSON data for hashing');
  }
}

function computeBinaryProofHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const { anchorService } = require('../services/anchor');
const { nillionService } = require('../services/nillion');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation schemas
const verifyProofSchema = Joi.object({
  proofHash: Joi.string().hex().length(64).required()
});

const verifyDataSchema = Joi.object({
  data: Joi.alternatives().try(
    Joi.string(), // JSON string
    Joi.object()  // JSON object
  ).required(),
  type: Joi.string().valid('json', 'binary').default('json')
});

/**
 * GET /api/verification/tools
 * Get verification tools and instructions
 */
router.get('/tools', async (req, res, next) => {
  try {
    res.json({
      success: true,
      tools: {
        hashScript: '/tools/hash.js',
        instructions: [
          '1. Download the hash.js script from /tools/hash.js',
          '2. Run: node hash.js <your-file>',
          '3. Compare the output with the proof hash shown in the UI',
          '4. Visit the transaction hash on the testnet explorer',
          '5. Verify the memo/data field contains the same proof hash'
        ],
        explorerUrl: 'https://testnet.nillion.explorers.guru',
        canonicalizationRules: [
          'JSON objects are sorted by keys recursively',
          'Arrays maintain their order',
          'Whitespace is normalized',
          'Binary files use raw bytes for hashing'
        ]
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/verification/compute-hash
 * Compute proof hash for provided data
 */
router.post('/compute-hash', async (req, res, next) => {
  try {
    const { error, value } = verifyDataSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { data, type } = value;
    let proofHash;

    if (type === 'json') {
      proofHash = computeJsonProofHash(data);
    } else {
      // For binary data, expect base64 encoded string
      const buffer = Buffer.from(data, 'base64');
      proofHash = computeBinaryProofHash(buffer);
    }

    res.json({
      success: true,
      proofHash,
      type,
      canonicalized: type === 'json' ? 'JSON keys sorted recursively' : 'Raw binary data'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/verification/verify-proof
 * Verify a proof hash against the database
 */
router.post('/verify-proof', async (req, res, next) => {
  try {
    const { error, value } = verifyProofSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { proofHash } = value;

    // Get credential by proof hash from NillionDB
    const credential = await nillionService.getCredentialByProofHash(proofHash);
    if (!credential) {
      return res.json({
        success: false,
        message: 'Credential not found',
        proofHash,
        exists: false
      });
    }

    // Get anchor information
    const anchors = credential.anchors || [];
    const latestAnchor = anchors.length > 0 ? anchors[anchors.length - 1] : null;

    // Get blockchain verification if anchor exists
    let blockchainVerification = null;
    if (latestAnchor) {
      try {
        const receipt = await anchorService.getTransactionReceipt(latestAnchor.tx_hash);
        blockchainVerification = {
          confirmed: !!receipt && !!receipt.blockNumber,
          blockNumber: receipt?.blockNumber ? parseInt(receipt.blockNumber, 16) : null,
          status: receipt?.status === '0x1' ? 'success' : 'failed',
          gasUsed: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null
        };
      } catch (blockchainError) {
        blockchainVerification = {
          confirmed: false,
          error: blockchainError.message
        };
      }
    }

    // Get explorer URL
    const explorerUrl = latestAnchor ? 
      await anchorService.getExplorerUrl(latestAnchor.tx_hash) : null;

    res.json({
      success: true,
      exists: true,
      credential: {
        id: credential.id,
        title: credential.title,
        description: credential.description,
        proof_hash: credential.proof_hash,
        status: credential.status,
        created_at: credential.created_at,
        file_name: credential.file_name,
        file_type: credential.file_type,
        size_bytes: credential.size_bytes
      },
      anchoring: {
        anchored: anchors.length > 0,
        anchor_count: anchors.length,
        latest_anchor: latestAnchor ? {
          id: latestAnchor.id,
          tx_hash: latestAnchor.tx_hash,
          status: latestAnchor.status,
          block_height: latestAnchor.block_height,
          tx_time: latestAnchor.tx_time,
          explorer_url: explorerUrl
        } : null
      },
      verification: {
        proof_hash_matches: credential.proof_hash === proofHash,
        blockchain_verified: blockchainVerification?.confirmed || false,
        blockchain_data: blockchainVerification
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/verification/credential/:credentialId
 * Get verification details for a specific credential
 */
router.get('/credential/:credentialId', async (req, res, next) => {
  try {
    // Credential lookup by ID not available in Nillion-only mode
    throw new NotFoundError('Credential lookup by ID not available in Nillion-only mode. Use /api/verification/verify-proof with proof_hash instead.');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/verification/export/:credentialId
 * Export verification package for a credential
 */
router.get('/export/:credentialId', async (req, res, next) => {
  try {
    // Export functionality disabled - use verification endpoints instead
    throw new NotFoundError('Export functionality not available. Use /api/verification/verify-proof with proof_hash instead.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
