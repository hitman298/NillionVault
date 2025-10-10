const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { db } = require('./supabase');
const { logger } = require('../middleware/errorHandler');

/**
 * Anchor Service for nilChain testnet transactions
 */
class AnchorService {
  constructor() {
    this.rpcUrl = process.env.NILLION_RPC_URL;
    this.privateKey = process.env.DEV_ADDRESS_PRIVATE_KEY;
    this.network = process.env.NILLION_NETWORK || 'testnet';
    
    if (!this.rpcUrl || !this.privateKey) {
      throw new Error('NILLION_RPC_URL and DEV_ADDRESS_PRIVATE_KEY are required');
    }

    this.client = axios.create({
      baseURL: this.rpcUrl,
      timeout: 30000
    });

    logger.info('Anchor service initialized', { 
      network: this.network,
      rpcUrl: this.rpcUrl 
    });
  }

  /**
   * Generate a new wallet address from private key
   */
  generateAddress(privateKey) {
    // This is a simplified implementation
    // In production, use proper cryptographic libraries
    const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
    return `nil${hash.substring(0, 40)}`;
  }

  /**
   * Get account balance
   */
  async getBalance(address) {
    try {
      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method: 'nil_getBalance',
        params: [address],
        id: 1
      });

      return {
        address,
        balance: response.data.result || '0',
        unit: 'NIL'
      };

    } catch (error) {
      logger.error('Failed to get balance', { 
        address, 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Get account nonce
   */
  async getNonce(address) {
    try {
      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method: 'nil_getTransactionCount',
        params: [address],
        id: 1
      });

      return parseInt(response.data.result || '0');

    } catch (error) {
      logger.error('Failed to get nonce', { 
        address, 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Create and sign a transaction
   */
  createTransaction(from, to, proofHash, nonce, gasPrice = '1000000000', gasLimit = '21000') {
    const transaction = {
      from,
      to,
      value: '0', // No value transfer, just anchoring
      data: `0x${Buffer.from(proofHash, 'hex').toString('hex')}`, // Proof hash as data
      nonce: `0x${nonce.toString(16)}`,
      gasPrice: `0x${parseInt(gasPrice).toString(16)}`,
      gasLimit: `0x${parseInt(gasLimit).toString(16)}`,
      chainId: this.getChainId()
    };

    // In a real implementation, you would sign this transaction properly
    // For demo purposes, we'll create a mock signature
    const txHash = crypto.createHash('sha256')
      .update(JSON.stringify(transaction))
      .digest('hex');

    return {
      transaction,
      signature: `0x${txHash}`,
      hash: txHash
    };
  }

  /**
   * Get chain ID for the network
   */
  getChainId() {
    switch (this.network) {
      case 'testnet':
        return 1337; // Nillion testnet chain ID
      case 'mainnet':
        return 1; // Nillion mainnet chain ID
      default:
        return 1337;
    }
  }

  /**
   * Send a transaction to the network
   */
  async sendTransaction(signedTx) {
    try {
      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method: 'nil_sendRawTransaction',
        params: [`0x${signedTx.signature}`],
        id: 1
      });

      if (response.data.error) {
        throw new Error(`Transaction failed: ${response.data.error.message}`);
      }

      return {
        txHash: response.data.result,
        blockNumber: null, // Will be filled when confirmed
        status: 'pending'
      };

    } catch (error) {
      logger.error('Failed to send transaction', { 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    try {
      const response = await this.client.post('', {
        jsonrpc: '2.0',
        method: 'nil_getTransactionReceipt',
        params: [txHash],
        id: 1
      });

      return response.data.result;

    } catch (error) {
      logger.error('Failed to get transaction receipt', { 
        txHash, 
        error: error.response?.data || error.message 
      });
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txHash, maxAttempts = 30, delay = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const receipt = await this.getTransactionReceipt(txHash);
        
        if (receipt && receipt.blockNumber) {
          logger.info('Transaction confirmed', { 
            txHash, 
            blockNumber: receipt.blockNumber,
            attempts: attempt 
          });
          
          return {
            txHash,
            blockNumber: parseInt(receipt.blockNumber, 16),
            status: receipt.status === '0x1' ? 'success' : 'failed',
            gasUsed: parseInt(receipt.gasUsed, 16),
            receipt
          };
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }
        
        logger.warn('Transaction confirmation attempt failed', { 
          txHash, 
          attempt, 
          error: error.message 
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Transaction confirmation timeout after ${maxAttempts} attempts`);
  }

  /**
   * Anchor a credential to the blockchain
   */
  async anchorCredential({ credentialId, proofHash, userId }) {
    try {
      logger.info('Starting credential anchoring', { credentialId, proofHash });

      // Get the credential
      const credential = await db.getCredentialById(credentialId);
      if (!credential) {
        throw new Error(`Credential ${credentialId} not found`);
      }

      // Generate address from private key
      const fromAddress = this.generateAddress(this.privateKey);
      const toAddress = fromAddress; // Self-transfer for anchoring

      // Get account nonce
      const nonce = await this.getNonce(fromAddress);

      // Create transaction with proof hash as data
      const { transaction, hash: txHash } = this.createTransaction(
        fromAddress,
        toAddress,
        proofHash,
        nonce
      );

      // Create anchor record
      const anchorData = {
        id: uuidv4(),
        credential_id: credentialId,
        tx_hash: txHash,
        status: 'pending',
        node_response: {
          transaction,
          network: this.network,
          fromAddress,
          toAddress,
          nonce
        }
      };

      const anchor = await db.createAnchor(anchorData);

      // Send transaction to network
      const txResult = await this.sendTransaction({ signature: txHash });
      
      // Update anchor with transaction result
      await db.updateAnchor(anchor.id, {
        tx_hash: txResult.txHash,
        node_response: {
          ...anchorData.node_response,
          txResult,
          sentAt: new Date().toISOString()
        }
      });

      // Wait for confirmation (async)
      this.waitForConfirmation(txResult.txHash)
        .then(async (confirmation) => {
          await db.updateAnchor(anchor.id, {
            status: confirmation.status === 'success' ? 'confirmed' : 'failed',
            block_height: confirmation.blockNumber,
            tx_time: new Date(),
            node_response: {
              ...anchorData.node_response,
              confirmation,
              confirmedAt: new Date().toISOString()
            }
          });

          // Update credential status
          await db.updateCredential(credentialId, {
            status: confirmation.status === 'success' ? 'anchored' : 'failed'
          });

          // Create audit log
          await db.createAuditLog({
            entity_type: 'anchor',
            entity_id: anchor.id,
            action: confirmation.status === 'success' ? 'confirmed' : 'failed',
            actor: 'system',
            metadata: {
              credentialId,
              proofHash,
              txHash: confirmation.txHash,
              blockNumber: confirmation.blockNumber
            }
          });

          logger.info('Credential anchoring completed', { 
            credentialId,
            txHash: confirmation.txHash,
            status: confirmation.status
          });
        })
        .catch(async (error) => {
          logger.error('Credential anchoring failed', { 
            credentialId,
            txHash: txResult.txHash,
            error: error.message 
          });

          await db.updateAnchor(anchor.id, {
            status: 'failed',
            node_response: {
              ...anchorData.node_response,
              error: error.message,
              failedAt: new Date().toISOString()
            }
          });

          await db.updateCredential(credentialId, { status: 'failed' });
        });

      // Create audit log
      await db.createAuditLog({
        entity_type: 'anchor',
        entity_id: anchor.id,
        action: 'created',
        actor: userId || 'system',
        metadata: {
          credentialId,
          proofHash,
          txHash: txResult.txHash
        }
      });

      return {
        anchorId: anchor.id,
        txHash: txResult.txHash,
        status: 'pending',
        message: 'Transaction submitted, awaiting confirmation'
      };

    } catch (error) {
      logger.error('Failed to anchor credential', { 
        credentialId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get transaction details from explorer
   */
  async getExplorerUrl(txHash) {
    const explorerBaseUrl = 'https://testnet.nillion.explorers.guru';
    return `${explorerBaseUrl}/tx/${txHash}`;
  }

  /**
   * Health check for anchor service
   */
  async healthCheck() {
    try {
      const testAddress = this.generateAddress(this.privateKey);
      const balance = await this.getBalance(testAddress);
      
      return {
        status: 'healthy',
        network: this.network,
        address: testAddress,
        balance: balance.balance
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
const anchorService = new AnchorService();

module.exports = { anchorService };
