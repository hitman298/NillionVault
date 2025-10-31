const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { nillionService } = require('../services/nillion');
const { queueService } = require('../services/queue');
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
const { ValidationError, NotFoundError, AppError, logger } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for now
    cb(null, true);
  }
});

// Validation schemas
const uploadSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(1000).optional(),
  email: Joi.string().email().optional(),
  clientProofHash: Joi.string().hex().length(64).optional(),
  jsonData: Joi.string().optional()
});

const verifySchema = Joi.object({
  proofHash: Joi.string().hex().length(64).required()
});

/**
 * POST /api/credentials/upload
 * Upload a credential file and create vault entry
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    // Skip validation for now - just get the data
    const { title, description, email, clientProofHash } = req.body || {};
    const file = req.file;

    if (!file && !req.body.jsonData) {
      throw new ValidationError('Either file or jsonData is required');
    }

    // Use filename as title if title is not provided
    const finalTitle = title || (file ? file.originalname : 'Uploaded Document');

    let proofHash;
    let fileData;
    let fileName;
    let fileType;
    let sizeBytes;

    // Handle JSON data upload
    if (req.body.jsonData) {
      try {
        const jsonData = JSON.parse(req.body.jsonData);
        proofHash = computeJsonProofHash(jsonData);
        fileData = Buffer.from(JSON.stringify(jsonData, null, 2));
        fileName = `${title}.json`;
        fileType = 'application/json';
        sizeBytes = fileData.length;
      } catch (parseError) {
        throw new ValidationError('Invalid JSON data');
      }
    } 
    // Handle file upload
    else if (file) {
      proofHash = computeBinaryProofHash(file.buffer);
      fileData = file.buffer;
      fileName = file.originalname;
      
      // Detect file type - prefer text/plain for text files
      const detectedMime = file.mimetype;
      if (detectedMime === 'application/json' || fileName.endsWith('.json')) {
        fileType = 'application/json';
      } else if (detectedMime === 'text/plain' || 
                 fileName.endsWith('.txt') || 
                 fileName.endsWith('.text') ||
                 detectedMime.startsWith('text/')) {
        fileType = 'text/plain'; // Use text/plain for text files
      } else {
        // For other file types, use detected MIME type or default to text/plain
        fileType = detectedMime || 'text/plain';
      }
      
      sizeBytes = file.size;
    }

    // Verify client-side proof hash if provided
    if (clientProofHash && clientProofHash !== proofHash) {
      throw new ValidationError('Client proof hash does not match server computation');
    }

    // Check if credential already exists in NillionDB
    let existingCredential = null;
    try {
      existingCredential = await nillionService.getCredentialByProofHash(proofHash);
      if (existingCredential) {
        return res.json({
          success: true,
          credentialId: existingCredential.id || existingCredential.credential_id,
          proofHash: existingCredential.proof_hash,
          status: existingCredential.status || 'vaulted',
          message: 'Credential already exists'
        });
      }
    } catch (nillionError) {
      logger.warn('Could not check for existing credential in NillionDB', {
        error: nillionError.message,
        proofHash
      });
      // Continue with upload - will create new credential
    }

    // Generate user ID
    const userId = uuidv4();
    
    // Create credential object
    const credential = {
      id: uuidv4(),
      proof_hash: proofHash,
      status: 'uploaded'
    };

    // Store file in Nillion SecretVault
    try {
      const vaultId = await nillionService.storeCredential(credential.id, fileData, {
        fileName,
        fileType,
        proofHash,
        sizeBytes,
        userId
      });


      // Anchor to nilChain (async, non-blocking)
      const { anchorService } = require('../services/anchor');
      let anchorInfo = null;
      
      if (anchorService) {
        anchorService.anchorCredential({
          credentialId: credential.id,
          proofHash,
          userId
        }).then((anchorResult) => {
          logger.info('Credential anchored', {
            credentialId: credential.id,
            txHash: anchorResult.txHash,
            status: anchorResult.status,
            anchorType: anchorResult.anchorType
          });
        }).catch((anchorError) => {
          logger.warn('Failed to anchor credential', {
            credentialId: credential.id,
            error: anchorError.message
          });
          // Continue - credential is still stored in NillionDB
        });
      } else {
        logger.info('Anchor service not available, skipping anchoring', {
          credentialId: credential.id
        });
      }


      res.json({
        success: true,
        credentialId: credential.id,
        proofHash,
        vaultId,
        status: 'vaulted',
        message: 'Credential uploaded and stored in NillionDB',
        anchorInfo: anchorInfo || {
          status: 'processing',
          message: 'Anchoring in progress...'
        }
      });

    } catch (vaultError) {
      logger.error('Failed to store in Nillion vault', { 
        credentialId: credential.id, 
        error: vaultError.message,
        stack: vaultError.stack
      });
      
      // Provide a more helpful error message
      const errorMessage = vaultError.message || 'Unknown error';
      throw new AppError(`Failed to store credential in vault: ${errorMessage}`, 500);
    }

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/list
 * Get all stored credentials (Nillion-only mode)
 * NOTE: This must come BEFORE /:id route to avoid route conflict
 */
router.get('/list', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await nillionService.getAllCredentials(
      parseInt(limit),
      parseInt(offset)
    );
    
    res.json({
      success: true,
      credentials: result.credentials,
      pagination: {
        limit: result.limit,
        offset: result.offset,
        total: result.total,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/:id
 * Get credential details
 */
router.get('/:id', async (req, res, next) => {
  try {
    // Credential lookup by ID not available in Nillion-only mode
    // Use verification endpoint with proof_hash instead
    throw new NotFoundError('Credential lookup by ID not available. Use /api/credentials/verify with proof_hash instead.');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/user/:userId
 * Get user's credentials
 */

/**
 * DELETE /api/credentials/:recordId
 * Delete a credential by record ID (_id)
 */
router.delete('/:recordId', async (req, res, next) => {
  try {
    const { recordId } = req.params;
    
    if (!recordId) {
      throw new ValidationError('Record ID is required');
    }

    const result = await nillionService.deleteCredential(recordId);
    
    res.json({
      success: true,
      message: result.message,
      recordId: result.recordId
    });

  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    // User credentials listing not available in Nillion-only mode
    // Use /api/credentials/list instead
    res.json({
      success: true,
      credentials: [],
      pagination: {
        limit: 0,
        offset: 0,
        total: 0
      },
      message: 'User credentials listing not available. Use /api/credentials/list instead'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/credentials/verify
 * Verify a credential's proof hash
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { error, value } = verifySchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { proofHash } = value;
    
    // Query NillionDB for credential by proof_hash
    let credential = null;
    try {
      credential = await nillionService.getCredentialByProofHash(proofHash);
    } catch (nillionError) {
      logger.error('Failed to query NillionDB for verification', {
        proofHash,
        error: nillionError.message
      });
    }
    
    
    if (!credential) {
      return res.json({
        success: false,
        message: 'Credential not found',
        proofHash
      });
    }

    // Check for anchor information
    let anchorInfo = null;
    const { anchorService } = require('../services/anchor');
    if (anchorService && anchorService.getAnchorByProofHash) {
      anchorInfo = anchorService.getAnchorByProofHash(proofHash);
    }

    res.json({
      success: true,
      credential: {
        id: credential.id || credential.credential_id,
        proof_hash: credential.proof_hash,
        file_name: credential.file_name,
        file_type: credential.file_type,
        size_bytes: credential.size_bytes,
        stored_at: credential.stored_at,
        created_at: credential.stored_at || credential.created_at, // Map stored_at to created_at for frontend compatibility
        status: credential.status || 'vaulted',
        anchors: credential.anchors || [],
        // Include decrypted content if available
        content: credential.document_content || null,
        // Include anchor information
        anchorStatus: anchorInfo ? anchorInfo.status : 'not_anchored',
        anchorType: anchorInfo ? anchorInfo.anchor_type : null,
        anchorTxHash: anchorInfo ? anchorInfo.tx_hash : null,
        anchorCreatedAt: anchorInfo ? anchorInfo.created_at : null
      },
      anchorInfo: anchorInfo ? {
        status: anchorInfo.status,
        anchorType: anchorInfo.anchor_type,
        txHash: anchorInfo.tx_hash,
        createdAt: anchorInfo.created_at
      } : null,
      message: 'Credential verified from NillionDB'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/:id/audit
 * Get audit logs for a credential
 */
router.get('/:id/audit', async (req, res, next) => {
  try {
    // Audit logs not available in Nillion-only mode
    res.json({
      success: true,
      auditLogs: [],
      message: 'Audit logs not available in Nillion-only mode'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
