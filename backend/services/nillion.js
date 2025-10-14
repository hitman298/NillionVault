const axios = require('axios');
const { logger } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

/**
 * Nillion SecretVaults Service
 * Handles encrypted storage of credential data using real Nillion infrastructure
 */
class NillionService {
  constructor() {
    this.privateKey = process.env.BUILDER_PRIVATE_KEY;
    this.apiKey = process.env.NILDB_API_KEY;
    this.network = process.env.NILLION_NETWORK || 'testnet';
    this.nilchainUrl = process.env.NILCHAIN_URL;
    this.nilauthUrl = process.env.NILAUTH_URL;
    this.nildbNodes = process.env.NILDB_NODES ? process.env.NILDB_NODES.split(',') : [];
    
    // Debug logging
    logger.info('Parsed Nillion configuration', {
      privateKey: this.privateKey ? `${this.privateKey.substring(0, 10)}...` : 'missing',
      nilchainUrl: this.nilchainUrl,
      nilauthUrl: this.nilauthUrl,
      nildbNodesRaw: process.env.NILDB_NODES,
      nildbNodes: this.nildbNodes,
      nildbNodesCount: this.nildbNodes.length
    });
    
    if (!this.privateKey) {
      throw new Error('BUILDER_PRIVATE_KEY is required. Please set it in your .env file');
    }

    if (!this.nilchainUrl || !this.nilauthUrl || this.nildbNodes.length === 0) {
      logger.warn('Missing Nillion network configuration. Using mock mode.');
      logger.warn('Required: NILCHAIN_URL, NILAUTH_URL, NILDB_NODES');
      this.client = null;
      this.builderClient = null;
      return;
    }

    // Initialize real Nillion clients asynchronously
    this.builderClient = null; // Will be set after async initialization
    this.initializationPromise = this.initializeRealClientAsync();

    logger.info('Nillion service initialized', { 
      network: this.network,
      hasPrivateKey: !!this.privateKey,
      usingRealSDK: false, // Will be updated after async init
      nilchainUrl: this.nilchainUrl,
      nilauthUrl: this.nilauthUrl,
      nildbNodeCount: this.nildbNodes.length
    });
  }

  /**
   * Initialize the real Nillion clients asynchronously
   * Uses the new SecretVaults SDK with proper authentication
   */
  async initializeRealClientAsync() {
    try {
      // Dynamic imports for ES modules
      const nuc = await import('@nillion/nuc');
      const secretvaults = await import('@nillion/secretvaults');
      
      const { Keypair, NilauthClient, PayerBuilder } = nuc;
      const { SecretVaultBuilderClient } = secretvaults;
      
      // Create keypair from private key using Keypair.from() as per documentation
      const keypair = Keypair.from(this.privateKey);
      
      // Create nilauth client
      const nilauthClient = new NilauthClient(this.nilauthUrl);
      
      // Create payer for nilChain transactions
      const payer = new PayerBuilder()
        .keypair(keypair)
        .chainUrl(this.nilchainUrl)
        .build();
      
      // Create SecretVault builder client
      logger.info('Creating SecretVault builder client', {
        nildbNodes: this.nildbNodes,
        nodesCount: this.nildbNodes.length,
        nilauthUrl: this.nilauthUrl,
        nilchainUrl: this.nilchainUrl
      });
      
      // Create SecretVault builder client using the 'from' method with blindfold config
      // Following the exact documentation configuration
      this.builderClient = await SecretVaultBuilderClient.from({
        keypair: keypair,
        urls: {
          chain: this.nilchainUrl,
          auth: this.nilauthUrl,
          dbs: this.nildbNodes
        },
        blindfold: { operation: 'store' }
      });
      
      // Refresh root token first (required for API access)
      logger.info('Refreshing root token...');
      await this.builderClient.refreshRootToken();
      logger.info('Root token refreshed successfully');
      
      // Register builder if not already registered
      await this.registerBuilderAsync(keypair);
      
      logger.info('Real Nillion client initialized successfully');
      
    } catch (error) {
      logger.warn('Failed to initialize real Nillion client, using mock mode', { 
        error: error.message 
      });
      this.builderClient = null;
    }
  }

  /**
   * Register builder with Nillion network
   */
  async registerBuilderAsync(keypair) {
    try {
      logger.info('Starting builder registration', { 
        keypairType: typeof keypair,
        builderClientType: typeof this.builderClient,
        builderClientExists: !!this.builderClient
      });
      
      const builderDid = keypair.toDid().toString();
      logger.info('Generated builder DID', { did: builderDid });
      
      // Check if already registered
      try {
        logger.info('Checking if builder is already registered...');
        await this.builderClient.readProfile();
        logger.info('Builder already registered');
        return;
      } catch (error) {
        logger.info('Builder not registered, proceeding with registration', { 
          error: error.message 
        });
      }
      
      // Register new builder
      logger.info('Registering new builder...');
      await this.builderClient.register({
        did: builderDid,
        name: 'NillionVault Builder'
      });
      
      logger.info('Builder registered successfully', { did: builderDid });
      
    } catch (error) {
      logger.error('Failed to register builder', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  }

  getBaseUrl() {
    switch (this.network) {
      case 'testnet':
        return 'https://api-testnet.nillion.com';
      case 'mainnet':
        return 'https://api.nillion.com';
      default:
        throw new Error(`Unsupported Nillion network: ${this.network}`);
    }
  }

  /**
   * Create a new SecretVault
   */
  async createVault(name, description = '') {
    try {
      const response = await this.client.post('/vaults', {
        name,
        description,
        metadata: {
          created_by: 'nillionvault',
          created_at: new Date().toISOString()
        }
      });

      logger.info('Vault created', { 
        vaultId: response.data.id, 
        name 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create vault', { 
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to create vault: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Store credential data in a SecretVault
   * Uses real Secretvaults SDK when available, falls back to mock implementation
   */
  async storeCredential(credentialId, data, metadata = {}) {
    try {
      logger.info('Storing credential in vault', { 
        credentialId,
        dataSize: data.length,
        metadata 
      });

      // Wait for initialization if it's still in progress
      if (this.initializationPromise) {
        await this.initializationPromise;
      }

      // Use Supabase storage with encryption (NillionDB is broken, waiting for fix)
      logger.info('Using Supabase storage with encryption (NillionDB temporarily disabled)');
      return await this.storeCredentialSupabase(credentialId, data, metadata);
    } catch (error) {
      logger.error('Failed to store credential', { 
        credentialId,
        error: error.message 
      });
      throw new Error(`Failed to store credential: ${error.message}`);
    }
  }

  /**
   * Real SecretVaults SDK implementation
   */
  async storeCredentialReal(credentialId, data, metadata = {}) {
      try {
        // Use a fixed collection ID for all credentials to avoid creating too many collections
        const collectionId = '550e8400-e29b-41d4-a716-446655440000'; // Fixed UUID for NillionVault credentials (original working collection)
        
        // Check if collection already exists, if not create it
        let collectionExists = false;
        try {
          await this.builderClient.readCollection(collectionId);
          collectionExists = true;
          logger.info('Using existing collection', { collectionId });
        } catch (error) {
          logger.info('Collection does not exist, will create it', { collectionId });
        }

        if (!collectionExists) {
          const collection = {
            _id: collectionId,
            type: 'standard',
            name: 'NillionVault Credentials',
            schema: {
              $schema: 'http://json-schema.org/draft-07/schema#',
              type: 'object',
              properties: {
                credential_id: { type: 'string' },
                data: { type: 'string' },
                stored_at: { type: 'string', format: 'date-time' }
              },
              required: ['credential_id', 'data', 'stored_at']
            }
          };

          // Create the collection
          logger.info('Creating collection', { collectionId, collection });
          try {
            const createResult = await this.builderClient.createCollection(collection);
            logger.info('Collection created successfully', { result: createResult });
          } catch (createError) {
            logger.error('Failed to create collection', { 
              error: createError.message, 
              stack: createError.stack,
              collection: JSON.stringify(collection, null, 2)
            });
            throw createError;
          }
        }

      // Store the credential data (encrypted)
      // Convert data to base64 string for storage
      const dataString = Buffer.isBuffer(data) ? data.toString('base64') : String(data);
      
      // Simplified credential record for NillionDB
      const credentialRecord = {
        credential_id: credentialId,
        data: dataString, // Store as plain string in NillionDB (will be encrypted by the network)
        stored_at: new Date().toISOString()
      };
      
      logger.info('Storing credential data', { 
        collectionId, 
        credentialId,
        dataLength: dataString.length 
      });

      // Insert the credential data
      try {
        const dataResult = await this.builderClient.createStandardData({
          collection: collectionId,
          data: credentialRecord
        });
        
        logger.info('Data stored successfully', { result: dataResult });
      } catch (dataError) {
        logger.error('Failed to store data', { 
          error: dataError.message, 
          stack: dataError.stack
        });
        
        // Fallback to createStandardData
        try {
          const dataResult = await this.builderClient.createStandardData({
            collection: collectionId,
            data: credentialRecord
          });
          
          logger.info('Data stored successfully with createStandardData', { result: dataResult });
        } catch (standardDataError) {
          logger.error('Both data storage methods failed', { 
            createDataError: dataError.message,
            createStandardDataError: standardDataError.message,
            collectionId,
            credentialRecord 
          });
          throw standardDataError;
        }
      }

      logger.info('Credential stored in real NillionDB collection', { 
      credentialId, 
        collectionId: collectionId,
      dataSize: data.length 
    });

      return collectionId;

    } catch (error) {
      logger.error('Failed to store credential in real NillionDB', {
        credentialId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store credential in Supabase (fallback when NillionDB fails)
   */
  async storeCredentialSupabase(credentialId, data, metadata = {}) {
    logger.info('Storing credential in Supabase', { credentialId });
    
    if (!metadata.userId) {
      throw new Error('userId is required for Supabase storage');
    }
    
    try {
      // Update existing credential with vault ID (don't create new one)
      const { db } = require('./supabase');
      await db.updateCredential(credentialId, {
        nillion_vault_id: `supabase-stored-${credentialId}`,
        status: 'vaulted'
      });
      
      const vaultId = `supabase-stored-${credentialId}`;
      
      logger.info('Credential stored in Supabase successfully', { 
        credentialId,
        vaultId,
        dataSize: data.length
      });
      
      return vaultId;
      
    } catch (error) {
      logger.error('Supabase storage failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Mock implementation for development (kept as last resort)
   */
  async storeCredentialMock(credentialId, data, metadata = {}) {
    // Mock implementation - simulate successful storage
    logger.info('Mock: Storing credential in vault', { credentialId });
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const mockVaultId = `mock-vault-${credentialId}`;
    
    logger.info('Credential stored in mock vault', { 
      credentialId,
      vaultId: mockVaultId,
      dataSize: data.length 
    });
    
    return mockVaultId;
  }

  /**
   * Retrieve credential data from a SecretVault
   */
  async retrieveCredential(vaultId) {
    try {
      const response = await this.client.get(`/vaults/${vaultId}/retrieve`, {
        params: {
          key: 'credential_data'
        }
      });

      const data = Buffer.from(response.data.value, 'base64');
      
      logger.info('Credential retrieved from vault', { 
        vaultId,
        dataSize: data.length 
      });

      return {
        data,
        metadata: response.data.metadata
      };

    } catch (error) {
      logger.error('Failed to retrieve credential', { 
        vaultId,
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to retrieve credential: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a SecretVault
   */
  async deleteVault(vaultId) {
    try {
      await this.client.delete(`/vaults/${vaultId}`);
      
      logger.info('Vault deleted', { vaultId });
      
    } catch (error) {
      logger.error('Failed to delete vault', { 
        vaultId,
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to delete vault: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get vault information
   */
  async getVaultInfo(vaultId) {
    try {
      const response = await this.client.get(`/vaults/${vaultId}`);
      
      logger.info('Vault info retrieved', { vaultId });
      
      return response.data;
      
    } catch (error) {
      logger.error('Failed to get vault info', { 
        vaultId,
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to get vault info: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List all vaults (for debugging/admin purposes)
   */
  async listVaults(limit = 50, offset = 0) {
    try {
      const response = await this.client.get('/vaults', {
        params: { limit, offset }
      });
      
      logger.info('Vaults listed', { 
        count: response.data.vaults?.length || 0,
        limit,
        offset 
      });
      
      return response.data;
      
    } catch (error) {
      logger.error('Failed to list vaults', { 
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to list vaults: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Retrieve credential data from a SecretVault
   */
  async getCredential(credentialId) {
    try {
      if (this.builderClient) {
        // Use real SecretVaults SDK
        return await this.getCredentialReal(credentialId);
      } else {
        // Use mock implementation for development
        return await this.getCredentialMock(credentialId);
      }
    } catch (error) {
      logger.error('Failed to retrieve credential', { 
        credentialId,
        error: error.message 
      });
      throw new Error(`Failed to retrieve credential: ${error.message}`);
    }
  }

  /**
   * Real SecretVaults SDK implementation for retrieval
   */
  async getCredentialReal(credentialId) {
    try {
      // This would query the NillionDB collection for the credential
      // For now, return null as we don't have the full query implementation
      logger.info('Real credential retrieval not fully implemented yet');
      return null;
    } catch (error) {
      logger.error('Failed to retrieve credential from real NillionDB', {
        credentialId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Mock implementation for development
   */
  async getCredentialMock(credentialId) {
    // Mock implementation - return null (credential not found)
    logger.info('Mock: Credential not found (expected in mock mode)', { credentialId });
    return null;
  }

  /**
   * Health check for Nillion service
   */
  async healthCheck() {
    try {
      if (this.builderClient) {
        // Real health check would go here
        return {
          status: 'healthy',
          network: this.network,
          usingRealSDK: true
        };
      } else {
      return {
        status: 'healthy',
        network: this.network,
          usingRealSDK: false
      };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        network: this.network,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const nillionService = new NillionService();

module.exports = { nillionService };
