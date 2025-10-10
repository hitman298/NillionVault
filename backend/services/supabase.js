const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../middleware/errorHandler');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

// Service role client (for backend operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Anonymous client (for public operations)
const supabaseAnon = supabaseAnonKey ? 
  createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Database service class for NillionVault operations
 */
class DatabaseService {
  
  // User operations
  async createUser(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('User created', { userId: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create user', { error: error.message });
      throw error;
    }
  }

  async getUserById(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get user', { userId, error: error.message });
      throw error;
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get user by email', { email, error: error.message });
      throw error;
    }
  }

  // Credential operations
  async createCredential(credentialData) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .insert([credentialData])
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('Credential created', { 
        credentialId: data.id, 
        proofHash: data.proof_hash 
      });
      return data;
    } catch (error) {
      logger.error('Failed to create credential', { error: error.message });
      throw error;
    }
  }

  async updateCredential(credentialId, updates) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .update(updates)
        .eq('id', credentialId)
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('Credential updated', { credentialId, updates });
      return data;
    } catch (error) {
      logger.error('Failed to update credential', { credentialId, error: error.message });
      throw error;
    }
  }

  async getCredentialById(credentialId) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          *,
          users!inner(email),
          anchors(*)
        `)
        .eq('id', credentialId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get credential', { credentialId, error: error.message });
      throw error;
    }
  }

  async getCredentialByProofHash(proofHash) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          *,
          users!inner(email),
          anchors(*)
        `)
        .eq('proof_hash', proofHash)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get credential by proof hash', { proofHash, error: error.message });
      throw error;
    }
  }

  async getUserCredentials(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          *,
          anchors(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get user credentials', { userId, error: error.message });
      throw error;
    }
  }

  // Anchor operations
  async createAnchor(anchorData) {
    try {
      const { data, error } = await supabase
        .from('anchors')
        .insert([anchorData])
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('Anchor created', { 
        anchorId: data.id, 
        txHash: data.tx_hash 
      });
      return data;
    } catch (error) {
      logger.error('Failed to create anchor', { error: error.message });
      throw error;
    }
  }

  async updateAnchor(anchorId, updates) {
    try {
      const { data, error } = await supabase
        .from('anchors')
        .update(updates)
        .eq('id', anchorId)
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('Anchor updated', { anchorId, updates });
      return data;
    } catch (error) {
      logger.error('Failed to update anchor', { anchorId, error: error.message });
      throw error;
    }
  }

  async getAnchorByTxHash(txHash) {
    try {
      const { data, error } = await supabase
        .from('anchors')
        .select(`
          *,
          credentials!inner(*)
        `)
        .eq('tx_hash', txHash)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get anchor by tx hash', { txHash, error: error.message });
      throw error;
    }
  }

  async getPendingAnchors() {
    try {
      const { data, error } = await supabase
        .from('anchors')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get pending anchors', { error: error.message });
      throw error;
    }
  }

  // Audit log operations
  async createAuditLog(logData) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .insert([logData])
        .select()
        .single();
        
      if (error) throw error;
      
      logger.info('Audit log created', { 
        logId: data.id, 
        action: logData.action 
      });
      return data;
    } catch (error) {
      logger.error('Failed to create audit log', { error: error.message });
      throw error;
    }
  }

  async getAuditLogs(entityType, entityId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Failed to get audit logs', { entityType, entityId, error: error.message });
      throw error;
    }
  }
}

// Create singleton instance
const db = new DatabaseService();

module.exports = {
  supabase,
  supabaseAnon,
  db
};
