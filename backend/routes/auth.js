const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const { db } = require('../services/supabase');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  publicKey: Joi.string().optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required()
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { email, publicKey } = value;

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      });
    }

    // Create new user
    const userData = {
      id: uuidv4(),
      email,
      public_key: publicKey
    };

    const user = await db.createUser(userData);

    // Create audit log
    await db.createAuditLog({
      entity_type: 'user',
      entity_id: user.id,
      action: 'create',
      actor: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: { email, hasPublicKey: !!publicKey }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      message: 'User registered successfully'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user (get user info)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ValidationError('Invalid request data', error.details);
    }

    const { email } = value;

    const user = await db.getUserByEmail(email);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Create audit log
    await db.createAuditLog({
      entity_type: 'user',
      entity_id: user.id,
      action: 'login',
      actor: user.id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: { email }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        public_key: user.public_key,
        created_at: user.created_at
      },
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/profile/:userId
 * Get user profile
 */
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get user statistics
    const credentials = await db.getUserCredentials(userId, 1000); // Get all for stats
    const auditLogs = await db.getAuditLogs('user', userId, 50);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        public_key: user.public_key,
        created_at: user.created_at,
        stats: {
          totalCredentials: credentials.length,
          anchoredCredentials: credentials.filter(c => c.status === 'anchored').length,
          totalAnchors: credentials.reduce((sum, c) => sum + (c.anchors?.length || 0), 0)
        },
        recentActivity: auditLogs.slice(0, 10)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/profile/:userId
 * Update user profile
 */
router.put('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { publicKey } = req.body;

    const user = await db.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Update user
    const updatedUser = await db.updateUser(userId, {
      public_key: publicKey,
      updated_at: new Date()
    });

    // Create audit log
    await db.createAuditLog({
      entity_type: 'user',
      entity_id: userId,
      action: 'update',
      actor: userId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      metadata: { updatedFields: ['public_key'] }
    });

    res.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
