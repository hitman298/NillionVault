const axios = require('axios');
const { logger } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

// Import the real Secretvaults SDK (install with: npm install @nillion/secretvaults)
// const { SecretVaultsClient } = require('@nillion/secretvaults');

/**
 * Nillion SecretVaults Service
 * Handles encrypted storage of credential data using real Nillion infrastructure
 */
class NillionService {
  constructor() {
    this.apiKey = process.env.NILLION_API_KEY;
    this.network = process.env.NILLION_NETWORK || 'testnet';
    
    if (!this.apiKey) {
      throw new Error('NILLION_API_KEY is required. Please subscribe to nilDB service at https://nilpay.vercel.app/');
    }

    // Initialize real Secretvaults client when SDK is available
    this.initializeRealClient();

    logger.info('Nillion service initialized', { 
      network: this.network,
      hasApiKey: !!this.apiKey,
      usingRealSDK: !!this.client
    });
  }

  /**
   * Initialize the real Secretvaults client
   * This will work once you install @nillion/secretvaults and have a valid API key
   */
  initializeRealClient() {
    try {
      // Uncomment these lines once you have the real SDK installed
      // const { SecretVaultsClient } = require('@nillion/secretvaults');
      // this.client = new SecretVaultsClient({
      //   apiKey: this.apiKey,
      //   network: this.network
      // });
      
      // For now, use mock implementation
      this.client = null;
      logger.warn('Using mock Nillion service. Install @nillion/secretvaults and subscribe to nilDB for real functionality.');
    } catch (error) {
      logger.warn('Real Secretvaults SDK not available, using mock implementation', { error: error.message });
      this.client = null;
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
      if (this.client) {
        // Use real Secretvaults SDK
        return await this.storeCredentialReal(credentialId, data, metadata);
      } else {
        // Use mock implementation for development
        return await this.storeCredentialMock(credentialId, data, metadata);
      }
    } catch (error) {
      logger.error('Failed to store credential', { 
        credentialId,
        error: error.message 
      });
      throw new Error(`Failed to store credential: ${error.message}`);
    }
  }

  /**
   * Real Secretvaults SDK implementation
   */
  async storeCredentialReal(credentialId, data, metadata = {}) {
    // Create collection for this credential
    const collection = await this.client.createCollection({
      name: `credential-${credentialId}`,
      schema: {
        credential_data: 'blob',
        metadata: 'json'
      }
    });

    // Insert the credential data
    await collection.insert({
      credential_data: data,
      metadata: {
        ...metadata,
        credential_id: credentialId,
        stored_at: new Date().toISOString()
      }
    });

    logger.info('Credential stored in real Nillion collection', { 
      credentialId, 
      collectionId: collection.id,
      dataSize: data.length 
    });

    return collection.id;
  }

  /**
   * Mock implementation for development
   */
  async storeCredentialMock(credentialId, data, metadata = {}) {
    // Create vault for this credential
    const vault = await this.createVault(
      `credential-${credentialId}`,
      `Vault for credential ${credentialId}`
    );

    const vaultId = vault.id;

    // Store the credential data
    const storeResponse = await this.client.post(`/vaults/${vaultId}/store`, {
      key: 'credential_data',
      value: data.toString('base64'),
      metadata: {
        ...metadata,
        credential_id: credentialId,
        stored_at: new Date().toISOString(),
        data_type: 'base64'
      }
    });

    logger.info('Credential stored in mock vault', { 
      credentialId, 
      vaultId,
      dataSize: data.length 
    });

    return vaultId;
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
   * Health check for Nillion service
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        network: this.network,
        response: response.data
      };
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
