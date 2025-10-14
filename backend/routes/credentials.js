const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { db } = require('../services/supabase');
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
      fileType = file.mimetype;
      sizeBytes = file.size;
    }

    // Verify client-side proof hash if provided
    if (clientProofHash && clientProofHash !== proofHash) {
      throw new ValidationError('Client proof hash does not match server computation');
    }

    // Check if credential already exists
    const existingCredential = await db.getCredentialByProofHash(proofHash);
    if (existingCredential) {
      return res.json({
        success: true,
        credentialId: existingCredential.id,
        proofHash: existingCredential.proof_hash,
        status: existingCredential.status,
        message: 'Credential already exists'
      });
    }

    // Get or create user
    let userId;
    if (email) {
      let user = await db.getUserByEmail(email);
      if (!user) {
        user = await db.createUser({ email });
      }
      userId = user.id;
    } else {
      // Create anonymous user
      userId = uuidv4();
      await db.createUser({ id: userId, email: null });
    }

    // Create credential record
    const credentialData = {
      id: uuidv4(),
      user_id: userId,
      title: finalTitle,
      description,
      proof_hash: proofHash,
      file_name: fileName,
      file_type: fileType,
      size_bytes: sizeBytes,
      status: 'uploaded'
    };

    const credential = await db.createCredential(credentialData);

    // Store file in Nillion SecretVault
    try {
      const vaultId = await nillionService.storeCredential(credential.id, fileData, {
        fileName,
        fileType,
        proofHash,
        sizeBytes,
        userId
      });

      // Update credential with vault ID
      await db.updateCredential(credential.id, {
        nillion_vault_id: vaultId,
        status: 'vaulted'
      });

      // Enqueue anchoring job (skip if Redis unavailable)
      try {
        await queueService.enqueueAnchorJob({
          credentialId: credential.id,
          proofHash,
          userId
        });
        logger.info('Anchoring job enqueued', { credentialId: credential.id });
      } catch (queueError) {
        logger.warn('Failed to enqueue anchoring job, continuing without queue', { 
          credentialId: credential.id,
          error: queueError.message 
        });
        // Continue without queue - anchoring can be done manually later
      }

      // Create audit log
      await db.createAuditLog({
        entity_type: 'credential',
        entity_id: credential.id,
        action: 'create',
        actor: userId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          fileName,
          fileType,
          sizeBytes,
          vaultId
        }
      });

      res.json({
        success: true,
        credentialId: credential.id,
        proofHash,
        vaultId,
        status: 'vaulted',
        message: 'Credential uploaded and queued for anchoring'
      });

    } catch (vaultError) {
      // Update credential status to failed
      await db.updateCredential(credential.id, { status: 'failed' });
      
      logger.error('Failed to store in Nillion vault', { 
        credentialId: credential.id, 
        error: vaultError.message 
      });
      
      throw new AppError('Failed to store credential in vault', 500);
    }

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
    const { id } = req.params;
    
    const credential = await db.getCredentialById(id);
    if (!credential) {
      throw new NotFoundError('Credential');
    }

    // Remove sensitive data
    const { nillion_vault_id, ...safeCredential } = credential;
    
    res.json({
      success: true,
      credential: safeCredential
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/credentials/user/:userId
 * Get user's credentials
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const credentials = await db.getUserCredentials(userId, parseInt(limit), parseInt(offset));
    
    // Remove sensitive data
    const safeCredentials = credentials.map(({ nillion_vault_id, ...cred }) => cred);
    
    res.json({
      success: true,
      credentials: safeCredentials,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: credentials.length
      }
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
    
    const credential = await db.getCredentialByProofHash(proofHash);
    if (!credential) {
      return res.json({
        success: false,
        message: 'Credential not found',
        proofHash
      });
    }

    res.json({
      success: true,
      credential: {
        id: credential.id,
        title: credential.title,
        proof_hash: credential.proof_hash,
        status: credential.status,
        created_at: credential.created_at,
        anchors: credential.anchors
      },
      message: 'Credential verified'
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
    const { id } = req.params;
    
    const credential = await db.getCredentialById(id);
    if (!credential) {
      throw new NotFoundError('Credential');
    }

    const auditLogs = await db.getAuditLogs('credential', id);
    
    res.json({
      success: true,
      auditLogs
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
