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
      
      const { Keypair, NilauthClient, PayerBuilder, Did } = nuc;
      const { SecretVaultBuilderClient } = secretvaults;
      
      // Store Did for later use in registration
      this.Did = Did;
      
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
      
      // Get Did object directly from keypair (already a Did instance)
      const builderDid = keypair.toDid();
      // Convert Did object to string - API expects string, not object
      const builderDidString = builderDid.toString ? builderDid.toString() : String(builderDid);
      logger.info('Generated builder DID', { 
        did: builderDidString,
        didType: typeof builderDid,
        didConstructor: builderDid?.constructor?.name
      });
      
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
      logger.info('Registering new builder...', { 
        willSendDidAs: typeof builderDidString,
        didString: builderDidString 
      });
      try {
        // API expects DID as a string, not as a Did object
        // Error: "Invalid input: expected string, received object"
      await this.builderClient.register({
          did: builderDidString, // Use string, not object
        name: 'NillionVault Builder'
      });
        logger.info('Builder registered successfully', { did: builderDidString });
      } catch (registerError) {
        // Extract error information from whatever format the SDK returns
        let errorMessage = 'Unknown error';
        let errorDetails = {};
        
        // Try multiple ways to extract error information
        if (registerError instanceof Error) {
          errorMessage = registerError.message || errorMessage;
          errorDetails = {
            message: registerError.message,
            name: registerError.name,
            stack: registerError.stack,
            code: registerError.code,
            cause: registerError.cause
          };
        } else if (Array.isArray(registerError)) {
          // SDK might return error array
          errorMessage = registerError.map(e => {
            if (typeof e === 'string') return e;
            if (e?.message) return e.message;
            if (e?.error) return e.error;
            return JSON.stringify(e);
          }).join(', ');
          errorDetails = { errors: registerError };
        } else if (typeof registerError === 'object' && registerError !== null) {
          // Try to extract from object
          errorMessage = registerError.message || 
                        registerError.error || 
                        registerError.msg ||
                        JSON.stringify(registerError);
          errorDetails = registerError;
        } else {
          errorMessage = String(registerError);
        }
        
        // Check for response/HTTP errors
        if (registerError.response) {
          const responseData = registerError.response.data || registerError.response.body || registerError.response;
          errorMessage = typeof responseData === 'string' 
            ? responseData 
            : (responseData?.message || responseData?.error || JSON.stringify(responseData));
          errorDetails.response = responseData;
        }
        
        // Check if it's a duplicate key error (builder already registered)
        // Error format: ["DuplicateEntryError", "document: {...}"]
        const hasDuplicateError = Array.isArray(registerError) && 
                                 registerError.some(e => 
                                   e?.error?.body?.errors?.some(err => 
                                     typeof err === 'string' && err.includes('DuplicateEntryError')
                                   )
                                 );
        const isDuplicateKey = hasDuplicateError ||
                              errorMessage.toLowerCase().includes('duplicate') || 
                              errorMessage.toLowerCase().includes('already exists') ||
                              (registerError instanceof Error && registerError.message?.toLowerCase().includes('duplicate'));
        
        if (isDuplicateKey) {
          logger.info('Builder registration duplicate key (already registered) - this is expected', { 
            did: builderDidString,
            errorMessage: 'Builder already registered (DuplicateEntryError)'
          });
        } else {
          // Log detailed error information
          logger.error('Builder registration failed - DETAILED', {
            errorMessage,
            ...errorDetails,
            didString: builderDidString,
            didType: typeof builderDid,
            didConstructor: builderDid?.constructor?.name,
            errorType: typeof registerError,
            errorIsArray: Array.isArray(registerError),
            errorKeys: typeof registerError === 'object' ? Object.keys(registerError) : []
          });
          
          // Console log for immediate visibility
          console.error('=== BUILDER REGISTRATION ERROR ===');
          console.error('Error type:', typeof registerError);
          console.error('Error is Array:', Array.isArray(registerError));
          console.error('Error value:', registerError);
          console.error('Extracted message:', errorMessage);
          if (Array.isArray(registerError)) {
            console.error('Error array items:', registerError.map((e, i) => ({ index: i, type: typeof e, value: e })));
          }
          if (typeof registerError === 'object' && registerError !== null) {
            console.error('Error object keys:', Object.keys(registerError));
            console.error('Error object:', JSON.stringify(registerError, Object.getOwnPropertyNames(registerError), 2));
          }
          console.error('DID string:', builderDidString);
          console.error('==================================');
          
          logger.warn('Continuing without builder registration - data storage should still work');
        }
      }
      
    } catch (error) {
      logger.error('Failed to register builder', { 
        error: error.message,
        stack: error.stack 
      });
      // Don't throw - builder registration failure shouldn't prevent Nillion from working
      // Log the error but allow the service to continue
      logger.warn('Builder registration failed but continuing - NillionDB operations may still work');
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
   * Store credential data in a SecretVault using Nillion SecretVaults SDK
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

      // Check if Nillion client is available
      if (!this.builderClient) {
        throw new Error('Nillion builder client not available');
      }

      // Use real Nillion SecretVaults SDK
      logger.info('Using Nillion SecretVaults SDK for storage');
      return await this.storeCredentialReal(credentialId, data, metadata);
    } catch (error) {
      logger.error('Failed to store credential in Nillion', { 
        credentialId,
        error: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  }

  /**
   * Real SecretVaults SDK implementation
   */
  async storeCredentialReal(credentialId, data, metadata = {}) {
      try {
        // CRITICAL: SDK extracts %allot BEFORE validation, so we CANNOT require it in schema
        // The old collection (1689f760-a7ea-4acb-813a-4e43495180d7) has required: ["%allot"] which fails
        // We need a new collection without the required constraint
        // Generate a new collection ID - will be created with schema that doesn't require %allot
        const collectionId = '3689f760-a7ea-4acb-813a-4e43495180d9'; // New collection compatible with SDK
        
        // Check if collection already exists and get its actual schema
        let collectionExists = false;
        let actualCollection = null;
        try {
          actualCollection = await this.builderClient.readCollection(collectionId);
          collectionExists = true;
          logger.info('Using existing collection', { 
            collectionId,
            collectionName: actualCollection?.name,
            collectionType: actualCollection?.type,
            collectionSchema: actualCollection?.schema ? JSON.stringify(actualCollection.schema, null, 2) : 'No schema in response'
          });
          
          // Log the actual schema from the collection to see what it expects
          if (actualCollection?.schema) {
            const schemaInfo = {
              collectionId,
              schemaType: actualCollection.schema.type,
              schemaItemsType: actualCollection.schema.items?.type,
              schemaProperties: actualCollection.schema.items?.properties ? Object.keys(actualCollection.schema.items.properties) : 'No properties',
              schemaRequired: actualCollection.schema.items?.required || [],
              documentContentExists: !!actualCollection.schema.items?.properties?.document_content,
              documentContentType: actualCollection.schema.items?.properties?.document_content?.type,
              documentContentProperties: actualCollection.schema.items?.properties?.document_content?.properties ? Object.keys(actualCollection.schema.items.properties.document_content.properties) : [],
              documentContentRequired: actualCollection.schema.items?.properties?.document_content?.required || []
            };
            
            logger.info('Actual collection schema from NillionDB', schemaInfo);
            
            // Log full schema for comparison
            console.log('=== ACTUAL COLLECTION SCHEMA FROM NILLIONDB ===');
            console.log(JSON.stringify(actualCollection.schema, null, 2));
            console.log('===============================================');
            
            // Verify our structure matches the schema
            if (schemaInfo.documentContentRequired.includes('%allot')) {
              logger.info('Schema requires %allot in document_content - this matches our structure');
            } else {
              logger.warn('Schema might not require %allot, or schema structure is different', {
                required: schemaInfo.documentContentRequired,
                properties: schemaInfo.documentContentProperties
              });
            }
          }
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
              type: 'array',
              items: {
              type: 'object',
              properties: {
                  _id: { type: 'string' }, // Record ID - required by SDK
                credential_id: { type: 'string' }, // Plaintext - for queries
                proof_hash: { type: 'string' }, // Plaintext - for verification
                file_name: { type: 'string' }, // Plaintext - for display
                file_type: { type: 'string' }, // Plaintext - for metadata
                size_bytes: { type: 'number' }, // Plaintext - for metadata
                stored_at: { type: 'string', format: 'date-time' }, // Plaintext - for sorting
                // Encrypted field for actual document content
                // NOTE: Do NOT require %allot in schema - SDK extracts it before validation
                // The SDK processes %allot fields for encryption BEFORE schema validation
                document_content: {
                  type: "object",
                  properties: {
                      "%allot": { type: "string" }
                  }
                  // DO NOT add "required: ['%allot']" - SDK extracts %allot before validation
                }
              },
                required: ['_id', 'credential_id', 'proof_hash', 'file_name', 'document_content', 'stored_at']
              }
            }
          };

          // Create the collection
          logger.info('Creating collection', { 
            collectionId, 
            collectionType: collection.type,
            collectionName: collection.name
          });
          
          try {
            const createResult = await this.builderClient.createCollection(collection);
            logger.info('Collection created successfully', { result: createResult });
          } catch (createError) {
            // Log full error details including any nested properties
            const allProps = Object.getOwnPropertyNames(createError);
            const errorDetails = {
              message: createError.message || 'Unknown error',
              name: createError.name,
              stack: createError.stack,
              code: createError.code,
              cause: createError.cause?.message || createError.cause,
              response: createError.response?.data || createError.response,
              errorString: String(createError),
              errorType: typeof createError,
              errorProps: allProps
            };
            
            // Try to stringify the error (may fail for circular refs)
            try {
              errorDetails.errorJSON = JSON.stringify(createError, Object.getOwnPropertyNames(createError));
            } catch (stringifyError) {
              errorDetails.stringifyError = 'Could not stringify error';
            }
            
            // Log EVERYTHING including the actual error object
            logger.error('Failed to create collection - DETAILED ERROR', { 
              ...errorDetails,
              collectionId,
              collectionName: collection.name,
              schemaProperties: Object.keys(collection.schema.properties || {}),
              fullCollectionObject: JSON.stringify(collection, null, 2),
              // Log the raw error object structure
              errorKeys: Object.keys(createError),
              errorValue: createError.toString ? createError.toString() : String(createError),
              // Check for response data
              responseStatus: createError.response?.status,
              responseData: createError.response?.data,
              responseText: createError.response?.text
            });
            
            // Also console.log for immediate visibility
            console.error('=== NILLION COLLECTION CREATION ERROR ===');
            console.error('Error object:', createError);
            console.error('Error type:', typeof createError);
            console.error('Error keys:', Object.keys(createError));
            if (createError.response) {
              console.error('Response status:', createError.response.status);
              console.error('Response data:', createError.response.data);
            }
            console.error('Collection object:', JSON.stringify(collection, null, 2));
            console.error('==========================================');
            
            // Create a more descriptive error
            const errorMsg = errorDetails.message || 
                           errorDetails.cause || 
                           errorDetails.errorString || 
                           'Unknown error during collection creation';
                           
            const descriptiveError = new Error(`Failed to create NillionDB collection: ${errorMsg}. Collection ID: ${collectionId}. Check collection schema and NillionDB configuration.`);
            descriptiveError.originalError = createError;
            descriptiveError.details = errorDetails;
            throw descriptiveError;
          }
        }

      // Store the credential data using hybrid approach (plaintext metadata + encrypted content)
      // Convert ALL data to plain text string - simpler format works better with SDK
      // Always convert to UTF-8 plain text, never base64 or JSON
      let dataString;
      if (Buffer.isBuffer(data)) {
        dataString = data.toString('utf8'); // Plain text UTF-8
      } else if (typeof data === 'string') {
        dataString = data; // Already a string, use as-is
      } else {
        // If it's an object, stringify it - but treat it as plain text
        // This means JSON files become plain text JSON strings
        dataString = JSON.stringify(data);
      }
      
      logger.info('Data prepared for plain text storage', {
        dataType: typeof data,
        isBuffer: Buffer.isBuffer(data),
        dataStringLength: dataString.length,
        dataStringPreview: dataString.substring(0, 100) + '...',
        format: 'plain-text'
      });
      
      // Validate plaintext field sizes (must be <= 4096 bytes when encoded)
      // Nillion requires each plaintext field to be encodable in 4096 bytes or fewer
      const plaintextFields = {
        credential_id: String(credentialId), // Ensure it's a string
        proof_hash: String(metadata.proofHash || 'unknown'),
        file_name: String(metadata.fileName || 'document.txt'),
        file_type: String(metadata.fileType || 'text/plain'), // Changed from application/json to text/plain
        size_bytes: Number(metadata.sizeBytes || dataString.length), // Keep as number
        stored_at: new Date().toISOString()
      };
      
      // Check each plaintext field size (for string fields, check UTF-8 encoding)
      // For numbers, they're typically small but check JSON encoding size
      const fieldSizes = {};
      for (const [fieldName, fieldValue] of Object.entries(plaintextFields)) {
        let encodedSize;
        if (typeof fieldValue === 'number') {
          // For numbers, check how large they are as JSON
          encodedSize = Buffer.from(JSON.stringify(fieldValue), 'utf8').length;
        } else {
          // For strings, check UTF-8 byte length
          encodedSize = Buffer.from(String(fieldValue), 'utf8').length;
        }
        
        fieldSizes[fieldName] = encodedSize;
        
        if (encodedSize > 4096) {
          logger.error('Plaintext field exceeds 4096 bytes', {
            fieldName,
            encodedSize,
            fieldValue: String(fieldValue).substring(0, 100) + '...',
            fieldType: typeof fieldValue
          });
          
          // Truncate string fields if too large
          if (typeof fieldValue === 'string' && fieldName === 'file_name') {
            // Truncate filename but keep extension if possible
            const extIndex = plaintextFields.file_name.lastIndexOf('.');
            if (extIndex > 0) {
              const ext = plaintextFields.file_name.substring(extIndex);
              const name = plaintextFields.file_name.substring(0, extIndex);
              plaintextFields.file_name = name.substring(0, 3500) + ext; // Leave room for extension
            } else {
              plaintextFields.file_name = plaintextFields.file_name.substring(0, 3500);
            }
            logger.warn('Truncated file_name to fit 4096 byte limit', {
              originalSize: encodedSize,
              newSize: Buffer.from(plaintextFields.file_name, 'utf8').length
            });
          } else {
            throw new Error(`Plaintext field '${fieldName}' is too large (${encodedSize} bytes when encoded). Maximum is 4096 bytes. Current value: ${String(fieldValue).substring(0, 50)}...`);
          }
        }
      }
      
      // Double-check all field sizes before creating the record
      const finalFieldSizes = {};
      for (const [fieldName, fieldValue] of Object.entries(plaintextFields)) {
        let encodedSize;
        if (typeof fieldValue === 'number') {
          encodedSize = Buffer.from(JSON.stringify(fieldValue), 'utf8').length;
        } else {
          encodedSize = Buffer.from(String(fieldValue), 'utf8').length;
        }
        finalFieldSizes[fieldName] = encodedSize;
        
        if (encodedSize > 4096) {
          logger.error('Plaintext field STILL exceeds 4096 bytes after validation', {
            fieldName,
            encodedSize,
            fieldValue: String(fieldValue).substring(0, 200),
            fieldType: typeof fieldValue
          });
          throw new Error(`Plaintext field '${fieldName}' is too large (${encodedSize} bytes). Maximum is 4096 bytes.`);
        }
      }
      
      logger.info('Plaintext field size validation', {
        fieldSizes: finalFieldSizes,
        allWithinLimit: Object.values(finalFieldSizes).every(size => size <= 4096),
        maxSize: Math.max(...Object.values(finalFieldSizes))
      });
      
      // Hybrid credential record: plaintext metadata + encrypted content
      // Records must have _id field and match the collection schema
      // IMPORTANT: All plaintext fields must be primitive types (string, number)
      // CRITICAL: For encrypted fields, the schema expects "%allot" as a direct property
      // Use Object.defineProperty to ensure the property is set correctly and enumerable
      const credentialRecord = {
        _id: String(uuidv4()), // Required: record ID - ensure it's a string
        credential_id: String(plaintextFields.credential_id),
        proof_hash: String(plaintextFields.proof_hash),
        file_name: String(plaintextFields.file_name),
        file_type: String(plaintextFields.file_type),
        size_bytes: Number(plaintextFields.size_bytes), // Keep as number for proper typing
        stored_at: String(plaintextFields.stored_at)
      };
      
      // Create document_content object with %allot property
      // CRITICAL: Use plain object literal - SDK expects standard JavaScript object
      // DO NOT use Object.create(null) as it may cause SDK processing issues
      const documentContentObj = {
        '%allot': String(dataString)
      };
      
      credentialRecord.document_content = documentContentObj;
      
      // Verify the structure
      if (!('%allot' in documentContentObj) || typeof documentContentObj['%allot'] !== 'string') {
        throw new Error('Failed to create document_content with %allot property');
      }
      
      // Validate the structure matches schema expectations
      if (!credentialRecord.document_content || typeof credentialRecord.document_content !== 'object') {
        throw new Error('document_content must be an object');
      }
      // Use 'in' operator instead of hasOwnProperty for objects created with Object.create(null)
      if (!('%allot' in credentialRecord.document_content)) {
        throw new Error('document_content must have required property "%allot"');
      }
      if (typeof credentialRecord.document_content['%allot'] !== 'string') {
        throw new Error('document_content["%allot"] must be a string');
      }
      
      // Verify it's enumerable in Object.keys
      const docContentKeys = Object.keys(credentialRecord.document_content);
      if (!docContentKeys.includes('%allot')) {
        logger.warn('document_content["%allot"] not enumerable, trying alternative approach');
        // Fallback: create fresh object
        credentialRecord.document_content = {};
        credentialRecord.document_content['%allot'] = String(dataString);
      }
      
      // Final validation: Check the actual record structure that will be sent to SDK
      // The SDK validates each field individually, so we must ensure each is <= 4096 bytes
      const recordForValidation = JSON.parse(JSON.stringify(credentialRecord));
      const recordSizes = {};
      const fieldViolations = [];
      
      for (const [key, value] of Object.entries(recordForValidation)) {
        if (key === 'document_content') {
          // Encrypted field - check structure but not size (encrypted fields don't have 4096 limit)
          recordSizes[key] = 'encrypted (no limit)';
          continue;
        }
        
        let encodedSize;
        if (typeof value === 'number') {
          // For numbers, check JSON encoding size
          encodedSize = Buffer.from(JSON.stringify(value), 'utf8').length;
        } else if (typeof value === 'string') {
          // For strings, check UTF-8 byte length
          encodedSize = Buffer.from(value, 'utf8').length;
        } else {
          // For objects, check JSON encoding size
          encodedSize = Buffer.from(JSON.stringify(value), 'utf8').length;
        }
        
        recordSizes[key] = encodedSize;
        
        // Verify plaintext fields
        if (encodedSize > 4096) {
          fieldViolations.push({
            field: key,
            size: encodedSize,
            type: typeof value,
            valuePreview: String(value).substring(0, 100)
          });
          logger.error('CRITICAL: Plaintext field in record exceeds 4096 bytes', {
            field: key,
            size: encodedSize,
            type: typeof value,
            value: String(value).substring(0, 200)
          });
        }
      }
      
      if (fieldViolations.length > 0) {
        const violationMessages = fieldViolations.map(v => 
          `Field '${v.field}': ${v.size} bytes (limit: 4096)`
        ).join(', ');
        throw new Error(`One or more plaintext fields exceed 4096 bytes: ${violationMessages}`);
      }
      
      logger.info('Credential record prepared with final validation', {
        collectionId,
        credentialId,
        recordFieldSizes: recordSizes,
        allFieldsValid: true,
        maxFieldSize: Math.max(...Object.values(recordSizes).filter(s => typeof s === 'number'))
      });
      
      // Additional check: Verify the entire record structure is valid
      // This helps catch any issues before sending to SDK
      try {
        const testSerialization = JSON.stringify(credentialRecord);
        const totalSize = Buffer.from(testSerialization, 'utf8').length;
        logger.info('Record serialization check', {
          totalSerializedSize: totalSize,
          recordKeys: Object.keys(credentialRecord)
        });
      } catch (serialError) {
        logger.error('Failed to serialize credential record', {
          error: serialError.message,
          record: credentialRecord
        });
        throw new Error(`Failed to serialize credential record: ${serialError.message}`);
      }
      
      logger.info('Credential record prepared', {
        collectionId,
        credentialId,
        plaintextFieldSizes: Object.fromEntries(
          Object.entries(plaintextFields).map(([k, v]) => [k, Buffer.from(String(v), 'utf8').length])
        ),
        encryptedDataSize: dataString.length
      });
      
      logger.info('Storing credential data', { 
        collectionId, 
        credentialId,
        dataLength: dataString.length 
      });

      // Insert the credential data
      // createStandardData expects body: { collection, data } format
      try {
        logger.info('Calling createStandardData', {
          collectionId,
          dataArrayLength: 1,
          recordFields: Object.keys(credentialRecord)
        });
        
        // CRITICAL: Use plain object literal for SDK - do NOT use Object.create(null)
        // The SDK expects standard JavaScript objects, not null-prototype objects
        const allotStringValue = String(credentialRecord.document_content['%allot']);
        
        // Create document_content as plain object literal - this is what SDK expects
        const finalDocumentContent = {
          '%allot': allotStringValue
        };
        
        // Verify it's correct before building the record
        if (!('%allot' in finalDocumentContent) || typeof finalDocumentContent['%allot'] !== 'string') {
          throw new Error('Failed to create document_content with %allot for SDK payload');
        }
        
        // Build the record with properly configured document_content
        const cleanDataRecord = {
          _id: String(credentialRecord._id),
          credential_id: String(credentialRecord.credential_id),
          proof_hash: String(credentialRecord.proof_hash),
          file_name: String(credentialRecord.file_name),
          file_type: String(credentialRecord.file_type),
          size_bytes: Number(credentialRecord.size_bytes),
          stored_at: String(credentialRecord.stored_at),
          document_content: finalDocumentContent
        };
        
        // Verify the structure multiple ways
        // Use 'in' operator instead of hasOwnProperty for objects created with Object.create(null)
        const hasAllot1 = cleanDataRecord.document_content && '%allot' in cleanDataRecord.document_content;
        const hasAllot2 = cleanDataRecord.document_content && '%allot' in cleanDataRecord.document_content; // Changed from hasOwnProperty
        const hasAllot3 = cleanDataRecord.document_content && Object.keys(cleanDataRecord.document_content).includes('%allot');
        const allotValue = cleanDataRecord.document_content && cleanDataRecord.document_content['%allot'];
        
        logger.info('Data record validation', {
          hasAllot1,
          hasAllot2,
          hasAllot3,
          allotValueType: typeof allotValue,
          allotValueExists: !!allotValue,
          documentContentKeys: cleanDataRecord.document_content ? Object.keys(cleanDataRecord.document_content) : [],
          documentContentType: typeof cleanDataRecord.document_content
        });
        
        if (!hasAllot1 || !hasAllot2 || !hasAllot3 || !allotValue) {
          logger.error('FAILED: document_content missing %allot after all checks', {
            hasAllot1,
            hasAllot2,
            hasAllot3,
            allotValue: !!allotValue,
            documentContent: cleanDataRecord.document_content
          });
          throw new Error('document_content missing required property "%allot" after validation. Keys: ' + (cleanDataRecord.document_content ? Object.keys(cleanDataRecord.document_content).join(', ') : 'none'));
        }
        
        const requestPayload = {
          collection: collectionId,
          data: [cleanDataRecord]
        };
        
        // Log the exact payload that will be sent
        const payloadString = JSON.stringify(requestPayload, null, 2);
        logger.info('Sending createStandardData request - FINAL STRUCTURE', {
          collectionId,
          dataArrayLength: 1,
          hasAllot: hasAllot1 && hasAllot2 && hasAllot3,
          allotValueType: typeof allotValue,
          allotValueLength: typeof allotValue === 'string' ? allotValue.length : 'N/A',
          documentContentKeys: Object.keys(cleanDataRecord.document_content),
          documentContentStringified: JSON.stringify(cleanDataRecord.document_content),
          requestPayloadJSON: payloadString,
          // Check if %allot appears in the stringified JSON
          payloadIncludesAllot: payloadString.includes('%allot'),
          payloadIncludesDocumentContent: payloadString.includes('document_content')
        });
        
        // Final check - verify %allot is in the JSON string
        if (!payloadString.includes('%allot')) {
          logger.error('CRITICAL: %allot is missing from the JSON payload string!', {
            payloadString: payloadString.substring(0, 500) + '...'
          });
          throw new Error('%allot property is missing from the JSON payload string - this should never happen');
        }
        
          const dataResult = await this.builderClient.createStandardData({
          body: requestPayload
        });
        
        logger.info('Data stored successfully in NillionDB', { 
          result: dataResult,
            collectionId,
          credentialId
        });
      } catch (dataError) {
        // Extract detailed error information from whatever format the SDK returns
        let errorMessage = 'Unknown error';
        let errorDetails = {};
        
        // Helper function to safely stringify error objects
        const stringifyError = (err) => {
          try {
            if (typeof err === 'string') return err;
            if (err instanceof Error) {
              return err.message || JSON.stringify(err, Object.getOwnPropertyNames(err));
            }
            if (typeof err === 'object' && err !== null) {
              // Try to extract meaningful error message
              if (err.message) return err.message;
              
              // Check nested error structure
              if (err.error) {
                const nestedErr = stringifyError(err.error);
                if (nestedErr && nestedErr !== 'Unknown error') return nestedErr;
              }
              
              // Check body for errors array or message
              if (err.body) {
                if (typeof err.body === 'string') return err.body;
                if (err.body.errors && Array.isArray(err.body.errors)) {
                  // Extract error messages from errors array
                  const errorMessages = err.body.errors.map(e => {
                    if (typeof e === 'string') return e;
                    if (e?.message) return e.message;
                    if (e?.error) return stringifyError(e.error);
                    return JSON.stringify(e);
                  }).filter(msg => msg && msg !== 'Unknown error');
                  if (errorMessages.length > 0) return errorMessages.join(', ');
                }
                if (err.body.message) return err.body.message;
                if (err.body.error) return stringifyError(err.body.error);
                // Try to stringify body as last resort
                try {
                  const bodyStr = JSON.stringify(err.body);
                  if (bodyStr && bodyStr !== '{}' && bodyStr !== '[]') return bodyStr;
                } catch {}
              }
              
              if (err.errors && Array.isArray(err.errors)) {
                return err.errors.map(e => stringifyError(e)).filter(msg => msg).join(', ');
              }
              
              // If we have status/statusCode, include it
              const status = err.status || err.statusCode;
              if (status) {
                return `HTTP ${status}: ${JSON.stringify(err, null, 2)}`;
              }
              
              return JSON.stringify(err, null, 2);
            }
            return String(err);
          } catch (stringifyErr) {
            return String(err);
          }
        };
        
        // Try multiple ways to extract error information
        if (dataError instanceof Error) {
          errorMessage = dataError.message || stringifyError(dataError);
          errorDetails = {
            message: dataError.message,
            name: dataError.name,
            stack: dataError.stack,
            code: dataError.code,
            cause: dataError.cause ? stringifyError(dataError.cause) : undefined
          };
        } else if (Array.isArray(dataError)) {
          // SDK might return error array - extract actual error messages from body
          const errorMessages = [];
          dataError.forEach((e, index) => {
            // Try to extract the actual API error message
            let actualError = null;
            
            // Check nested error structure: e.error.body.errors
            if (e?.error?.body?.errors) {
              if (Array.isArray(e.error.body.errors)) {
                actualError = e.error.body.errors
                  .map(err => typeof err === 'string' ? err : JSON.stringify(err))
                  .join(', ');
              } else {
                actualError = stringifyError(e.error.body.errors);
              }
            }
            
            // Check: e.error.body.message
            if (!actualError && e?.error?.body?.message) {
              actualError = e.error.body.message;
            }
            
            // Check: e.error.message (but skip generic "Request failed")
            if (!actualError && e?.error?.message) {
              const msg = e.error.message;
              if (!msg.includes('Request failed:') || msg.length > 50) {
                actualError = msg;
              }
            }
            
            // Check: e.body.errors
            if (!actualError && e?.body?.errors) {
              if (Array.isArray(e.body.errors)) {
                actualError = e.body.errors
                  .map(err => typeof err === 'string' ? err : JSON.stringify(err))
                  .join(', ');
              }
            }
            
            // Fallback to stringifyError
            const msg = actualError || stringifyError(e);
            
            logger.error(`Error array item ${index}`, {
              index,
              type: typeof e,
              node: e.node,
              extractedError: actualError,
              errorMessage: msg,
              hasErrorBody: !!e.error?.body,
              hasBodyErrors: !!e.error?.body?.errors,
              errorStatus: e.error?.status || e.error?.statusCode,
              fullError: e
            });
            
            errorMessages.push(msg);
          });
          
          errorMessage = errorMessages.filter(m => m && m !== 'Unknown error').join(' | ') || errorMessages.join(' | ');
          errorDetails = { 
            errors: dataError,
            errorCount: dataError.length,
            errorMessages 
          };
        } else if (typeof dataError === 'object' && dataError !== null) {
          // Try to extract from object
          errorMessage = stringifyError(dataError);
          errorDetails = dataError;
        } else {
          errorMessage = String(dataError);
        }
        
        // Check for response/HTTP errors
        if (dataError.response) {
          const responseData = dataError.response.data || dataError.response.body || dataError.response;
          const responseMsg = stringifyError(responseData);
          errorMessage = responseMsg || errorMessage;
          errorDetails.response = responseData;
          errorDetails.responseStatus = dataError.response.status;
        }
        
        // Also check for nested error arrays in the error structure
        if (dataError.errors && Array.isArray(dataError.errors)) {
          const nestedErrors = dataError.errors.map(e => stringifyError(e)).join(' | ');
          if (nestedErrors && nestedErrors !== errorMessage) {
            errorMessage = `${errorMessage} | Nested: ${nestedErrors}`;
          }
        }
        
        // Log detailed error
        logger.error('Failed to store data in NillionDB', { 
          errorMessage,
          ...errorDetails,
            collectionId,
          credentialId,
          recordFields: Object.keys(credentialRecord),
          recordSizes: {
            _id: Buffer.from(String(credentialRecord._id), 'utf8').length,
            credential_id: Buffer.from(String(credentialRecord.credential_id), 'utf8').length,
            proof_hash: Buffer.from(String(credentialRecord.proof_hash), 'utf8').length,
            file_name: Buffer.from(String(credentialRecord.file_name), 'utf8').length,
            file_type: Buffer.from(String(credentialRecord.file_type), 'utf8').length,
            size_bytes: Buffer.from(JSON.stringify(credentialRecord.size_bytes), 'utf8').length,
            stored_at: Buffer.from(String(credentialRecord.stored_at), 'utf8').length,
            document_content_size: Buffer.from(JSON.stringify(credentialRecord.document_content), 'utf8').length
          }
        });
        
        // Console log for immediate visibility with proper stringification
        console.error('=== NILLION DATA STORAGE ERROR ===');
        console.error('Error type:', typeof dataError);
        console.error('Error is Array:', Array.isArray(dataError));
        console.error('Extracted message:', errorMessage);
        
        if (Array.isArray(dataError)) {
          console.error('\n========== ERROR ARRAY ANALYSIS ==========');
          console.error('Error array length:', dataError.length);
          console.error('Full error array:', JSON.stringify(dataError, null, 2));
          
          dataError.forEach((e, i) => {
            console.error(`\n--- Error array item ${i} ---`);
            console.error(`Type:`, typeof e);
            if (typeof e === 'object' && e !== null) {
              console.error(`Keys:`, Object.keys(e));
              
              // Log node information
              if (e.node) {
                console.error(`Node:`, e.node);
              }
              
              // Log error object with all properties
              if (e.error) {
                console.error(`\n--- Item ${i} Error Object ---`);
                console.error(`Error type:`, typeof e.error);
                console.error(`Error keys:`, Object.keys(e.error || {}));
                
                // Try to stringify the entire error object
                try {
                  const errorStr = JSON.stringify(e.error, Object.getOwnPropertyNames(e.error), 2);
                  console.error(`Full error object:\n${errorStr}`);
                } catch (strErr) {
                  console.error(`Could not stringify error object:`, strErr.message);
                  console.error(`Error object (toString):`, e.error?.toString?.());
                }
                
                // Check specific properties
                if (e.error.body) {
                  console.error(`\n--- Item ${i} Error Body ---`);
                  try {
                    const bodyStr = JSON.stringify(e.error.body, null, 2);
                    console.error(`Error body:\n${bodyStr}`);
                  } catch (strErr) {
                    console.error(`Could not stringify body:`, strErr.message);
                  }
                  
                  if (e.error.body.errors && Array.isArray(e.error.body.errors)) {
                    console.error(`\n--- Item ${i} Body Errors Array ---`);
                    e.error.body.errors.forEach((bodyErr, j) => {
                      console.error(`  Body error ${j}:`, typeof bodyErr === 'string' ? bodyErr : JSON.stringify(bodyErr, null, 2));
                    });
                  }
                  
                  if (e.error.body.message) {
                    console.error(`Body message:`, e.error.body.message);
                  }
                  
                  // Check for any other properties in body
                  console.error(`Body keys:`, Object.keys(e.error.body || {}));
                }
                
                if (e.error.message) {
                  console.error(`Error message:`, e.error.message);
                }
                
                if (e.error.status) {
                  console.error(`HTTP Status:`, e.error.status);
                }
                
                if (e.error.statusCode) {
                  console.error(`HTTP Status Code:`, e.error.statusCode);
                }
                
                // Check response property
                if (e.error.response) {
                  console.error(`\n--- Item ${i} Error Response ---`);
                  console.error(`Response status:`, e.error.response.status);
                  console.error(`Response statusText:`, e.error.response.statusText);
                  try {
                    console.error(`Response data:`, JSON.stringify(e.error.response.data, null, 2));
                  } catch {}
                }
              }
              
              // Check direct body property (not nested in error)
              if (e.body) {
                console.error(`\n--- Item ${i} Direct Body ---`);
                try {
                  console.error(`Body:`, JSON.stringify(e.body, null, 2));
                } catch (strErr) {
                  console.error(`Could not stringify direct body:`, strErr.message);
                }
              }
              
              // Try to get full error details using all available methods
              console.error(`\n--- Item ${i} Complete Error Object ---`);
              try {
                const fullError = JSON.stringify(e, (key, value) => {
                  // Include all properties, even non-enumerable ones
                  if (value instanceof Error) {
                    return {
                      name: value.name,
                      message: value.message,
                      stack: value.stack,
                      ...Object.getOwnPropertyNames(value).reduce((acc, prop) => {
                        try {
                          acc[prop] = value[prop];
                        } catch {}
                        return acc;
                      }, {})
                    };
                  }
                  return value;
                }, 2);
                console.error(`Complete error object:\n${fullError}`);
              } catch (stringifyErr) {
                console.error(`Could not stringify complete error:`, stringifyErr.message);
                console.error(`Error as string:`, String(e));
              }
            } else {
              console.error(`Value (not object):`, e);
            }
          });
          console.error('==========================================\n');
        }
        
        if (typeof dataError === 'object' && dataError !== null && !Array.isArray(dataError)) {
          console.error('Error object keys:', Object.keys(dataError));
          try {
            console.error('Error object (stringified):', JSON.stringify(dataError, Object.getOwnPropertyNames(dataError), 2));
          } catch (stringifyErr) {
            console.error('Could not stringify error object:', stringifyErr.message);
          }
        }
        
        if (dataError.response) {
          console.error('Error response status:', dataError.response.status);
          console.error('Error response data:', stringifyError(dataError.response.data || dataError.response.body));
        }
        
        console.error('Collection ID:', collectionId);
        console.error('Record structure:', {
          fields: Object.keys(credentialRecord),
          _id: credentialRecord._id,
          credential_id: String(credentialRecord.credential_id).substring(0, 20) + '...',
          has_document_content: !!credentialRecord.document_content,
          document_content_keys: Object.keys(credentialRecord.document_content || {})
        });
        console.error('==================================');
        
        // Throw error with proper message
        const finalMessage = errorMessage || 'Unknown error. Check NillionDB configuration and network connectivity.';
        const newError = new Error(`NillionDB storage failed: ${finalMessage}`);
        newError.originalError = dataError;
        throw newError;
      }

      logger.info('Credential stored in real NillionDB collection', { 
      credentialId, 
        collectionId: collectionId,
      dataSize: data.length 
    });

      return collectionId;

    } catch (error) {
      // Log full error details
      const errorDetails = {
        message: error.message || 'Unknown error',
        name: error.name,
        stack: error.stack,
        code: error.code,
        cause: error.cause?.message || error.cause,
        originalError: error.originalError,
        errorString: String(error)
      };
      
      // Try to extract more detailed error information
      let detailedMessage = errorDetails.message;
      
      // Check for response data
      if (error.response) {
        const responseData = error.response.data || error.response.body;
        if (responseData) {
          detailedMessage = typeof responseData === 'string' 
            ? responseData 
            : JSON.stringify(responseData);
        }
      }
      
      // Check for nested errors (some SDKs return error arrays)
      if (error.errors && Array.isArray(error.errors)) {
        detailedMessage = error.errors.map(e => 
          typeof e === 'string' ? e : (e.message || JSON.stringify(e))
        ).join(', ');
      }
      
      // Log full details
      logger.error('Failed to store credential in real NillionDB', {
        credentialId,
        ...errorDetails,
        responseData: error.response?.data,
        errors: error.errors,
        detailedMessage
      });
      
      // Console log for immediate visibility
      console.error('=== NILLION DATA STORAGE ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      console.error('Error errors:', error.errors);
      console.error('==================================');
      
      // Ensure we throw an error with a proper message
      const finalMessage = detailedMessage || errorDetails.message || errorDetails.errorString || 'Unknown error. Check NillionDB configuration and network connectivity.';
      const newError = new Error(`NillionDB storage failed: ${finalMessage}`);
      newError.originalError = error;
      throw newError;
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
   * Query credential by proof_hash from NillionDB
   */
  async getCredentialByProofHash(proofHash) {
    try {
      // Ensure builder client is initialized
      await this.initializationPromise;
      if (!this.builderClient) {
        throw new Error('Nillion builder client not initialized');
      }

      const collectionId = '3689f760-a7ea-4acb-813a-4e43495180d9';
      
      // Query NillionDB collection by proof_hash
      // Using queryStandardData to search by proof_hash field
      logger.info('Querying NillionDB for credential by proof_hash', { 
        collectionId, 
        proofHash 
      });

      try {
        // Use REST API to query NillionDB directly since SDK doesn't have readStandardData
        // Query each node's REST API to find records matching the proof_hash
        logger.info('Querying NillionDB via REST API for credential by proof_hash', { 
          collectionId,
          proofHash,
          nodes: this.nildbNodes
        });

        // Refresh root token for authentication
        await this.builderClient.refreshRootToken();
        
        // Use the SDK's findData method to query by proof_hash
        // findData allows querying by field values
        logger.info('Using SDK findData method to query by proof_hash', { 
          collectionId,
          proofHash
        });
        
        let matchingRecord = null;
        
        try {
          // Use findData to search for records matching the proof_hash
          // findData typically takes: collection, filter/query object
          const queryResult = await this.builderClient.findData({
            collection: collectionId,
            filter: {
              proof_hash: proofHash
            }
          });
          
          logger.info('findData query result', { 
            collectionId,
            proofHash,
            resultType: typeof queryResult,
            hasResult: !!queryResult,
            resultKeys: queryResult && typeof queryResult === 'object' ? Object.keys(queryResult) : []
          });
          
          // Process the result - findData may return data in different formats
          let dataArray = null;
          
          // Format 1: Direct array
          if (Array.isArray(queryResult)) {
            dataArray = queryResult;
          }
          // Format 2: { data: [...] }
          else if (queryResult && queryResult.data && Array.isArray(queryResult.data)) {
            dataArray = queryResult.data;
          }
          // Format 3: Node-based response (like createStandardData)
          else if (queryResult && typeof queryResult === 'object') {
            // Check if it's a node-based response
            const nodeKeys = Object.keys(queryResult);
            for (const nodeKey of nodeKeys) {
              const nodeData = queryResult[nodeKey];
              if (nodeData && nodeData.data && Array.isArray(nodeData.data)) {
                dataArray = nodeData.data;
                break;
              } else if (Array.isArray(nodeData)) {
                dataArray = nodeData;
                break;
              }
            }
            // If no node structure, check if queryResult itself has data array
            if (!dataArray && queryResult.results && Array.isArray(queryResult.results)) {
              dataArray = queryResult.results;
            }
          }
          
          if (dataArray && Array.isArray(dataArray)) {
            logger.info('Found data array from findData', { 
              collectionId,
              arrayLength: dataArray.length,
              firstItemKeys: dataArray[0] ? Object.keys(dataArray[0]) : []
            });
            
            // Find matching record by proof_hash (in case filter didn't work)
            matchingRecord = dataArray.find(record => record.proof_hash === proofHash);
            
            if (matchingRecord) {
              logger.info('Credential found via findData', { 
                collectionId,
                proofHash,
                recordId: matchingRecord._id,
                credentialId: matchingRecord.credential_id
              });
            } else {
              logger.warn('findData returned data but no matching record', { 
                collectionId,
                proofHash,
                totalRecords: dataArray.length,
                proofHashesInData: dataArray.map(r => r.proof_hash).slice(0, 5)
              });
            }
          } else {
            logger.warn('findData did not return a data array', { 
              collectionId,
              proofHash,
              resultType: typeof queryResult,
              resultStructure: queryResult ? JSON.stringify(queryResult, null, 2).substring(0, 300) : 'null'
            });
          }
          
        } catch (findDataError) {
          logger.error('findData query failed', {
            collectionId,
            proofHash,
            error: findDataError.message,
            errorType: typeof findDataError,
            errorKeys: findDataError && typeof findDataError === 'object' ? Object.keys(findDataError) : []
          });
          
          // Try alternative: findData might take different parameters
          try {
            logger.info('Trying alternative findData signature', { collectionId, proofHash });
            const altResult = await this.builderClient.findData(collectionId, {
              proof_hash: proofHash
            });
            
            logger.info('Alternative findData result', { 
              hasResult: !!altResult,
              resultType: typeof altResult
            });
            
            if (altResult && Array.isArray(altResult)) {
              matchingRecord = altResult.find(record => record.proof_hash === proofHash);
            } else if (altResult && altResult.data && Array.isArray(altResult.data)) {
              matchingRecord = altResult.data.find(record => record.proof_hash === proofHash);
            }
            
          } catch (altError) {
            logger.error('Alternative findData also failed', { error: altError.message });
          }
        }

        if (matchingRecord) {
          // Extract decrypted content from document_content.%allot
          let decryptedContent = null;
          if (matchingRecord.document_content && matchingRecord.document_content['%allot']) {
            // The SDK should return decrypted content in %allot
            decryptedContent = matchingRecord.document_content['%allot'];
          } else if (typeof matchingRecord.document_content === 'string') {
            // Sometimes it might be returned as a plain string
            decryptedContent = matchingRecord.document_content;
          }

          return {
            id: matchingRecord.credential_id,
            proof_hash: matchingRecord.proof_hash,
            file_name: matchingRecord.file_name,
            file_type: matchingRecord.file_type,
            size_bytes: matchingRecord.size_bytes,
            stored_at: matchingRecord.stored_at,
            created_at: matchingRecord.stored_at, // Map stored_at to created_at for frontend compatibility
            credential_id: matchingRecord.credential_id,
            _id: matchingRecord._id,
            document_content: decryptedContent, // Decrypted message content
            status: 'vaulted'
          };
        }

        logger.info('Credential not found in NillionDB after querying all nodes', { 
          collectionId, 
          proofHash 
        });
        
        return null;

      } catch (queryError) {
        logger.error('Failed to query NillionDB', {
          collectionId,
          proofHash,
          error: queryError.message || String(queryError),
          errorType: typeof queryError
        });
        throw queryError;
      }

    } catch (error) {
      logger.error('Failed to get credential by proof hash from NillionDB', {
        proofHash,
        error: error.message || String(error)
      });
      throw error;
    }
  }

  /**
   * Get all credentials from NillionDB (for listing/search)
   */
  async getAllCredentials(limit = 50, offset = 0) {
    try {
      await this.initializationPromise;
      if (!this.builderClient) {
        throw new Error('Nillion builder client not initialized');
      }

      const collectionId = '3689f760-a7ea-4acb-813a-4e43495180d9';
      
      logger.info('Querying all credentials from NillionDB', { 
        collectionId,
        limit,
        offset
      });

      try {
        // Try different approaches to get all records
        // The SDK might require different parameters for querying all records
        let queryResult;
        let lastError = null;
        
        // Approach 1: Try findData without filter
        try {
          queryResult = await this.builderClient.findData({
            collection: collectionId
            // No filter - should return all records
          });
          logger.info('findData without filter succeeded');
        } catch (noFilterError) {
          lastError = noFilterError;
          logger.info('findData without filter failed, trying with empty filter', {
            collectionId,
            error: noFilterError.message
          });
          
          // Approach 2: Try with empty filter
          try {
            queryResult = await this.builderClient.findData({
              collection: collectionId,
              filter: {}
            });
            logger.info('findData with empty filter succeeded');
          } catch (emptyFilterError) {
            lastError = emptyFilterError;
            logger.info('findData with empty filter failed, trying alternative signature', {
              collectionId,
              error: emptyFilterError.message
            });
            
            // Approach 3: Try alternative signature (collection first, then options)
            try {
              queryResult = await this.builderClient.findData(collectionId, {});
              logger.info('findData with alternative signature succeeded');
            } catch (altError) {
              lastError = altError;
              // All approaches failed, throw the last error
              throw lastError;
            }
          }
        }

        logger.info('findData query result for all credentials', { 
          collectionId,
          hasResult: !!queryResult,
          resultType: typeof queryResult,
          resultKeys: queryResult && typeof queryResult === 'object' ? Object.keys(queryResult) : []
        });

        // Process the result - same format as getCredentialByProofHash
        let dataArray = null;
        if (Array.isArray(queryResult)) {
          dataArray = queryResult;
        } else if (queryResult && queryResult.data && Array.isArray(queryResult.data)) {
          dataArray = queryResult.data;
        } else if (queryResult && typeof queryResult === 'object') {
          const nodeKeys = Object.keys(queryResult);
          for (const nodeKey of nodeKeys) {
            const nodeData = queryResult[nodeKey];
            if (nodeData && nodeData.data && Array.isArray(nodeData.data)) {
              dataArray = nodeData.data;
              break;
            } else if (Array.isArray(nodeData)) {
              dataArray = nodeData;
              break;
            }
          }
        }

        if (dataArray && Array.isArray(dataArray)) {
          logger.info('Found credentials array', { 
            collectionId,
            totalRecords: dataArray.length
          });

          // Sort by stored_at descending (newest first)
          dataArray.sort((a, b) => {
            const dateA = new Date(a.stored_at || 0).getTime();
            const dateB = new Date(b.stored_at || 0).getTime();
            return dateB - dateA;
          });

          // Apply pagination
          const paginatedData = dataArray.slice(offset, offset + limit);

          // Map to credential format
          const credentials = paginatedData.map(record => {
            let decryptedContent = null;
            if (record.document_content && record.document_content['%allot']) {
              decryptedContent = record.document_content['%allot'];
            } else if (typeof record.document_content === 'string') {
              decryptedContent = record.document_content;
            }

            return {
              id: record.credential_id,
              proof_hash: record.proof_hash,
              file_name: record.file_name,
              file_type: record.file_type,
              size_bytes: record.size_bytes,
              stored_at: record.stored_at,
              created_at: record.stored_at,
              _id: record._id,
              content: decryptedContent,
              status: 'vaulted'
            };
          });

          return {
            credentials,
            total: dataArray.length,
            limit,
            offset,
            hasMore: offset + limit < dataArray.length
          };
        }

        return {
          credentials: [],
          total: 0,
          limit,
          offset,
          hasMore: false
        };

      } catch (findDataError) {
        // Extract detailed error information
        let errorMessage = 'Unknown error';
        let errorDetails = null;

        if (findDataError && typeof findDataError === 'object') {
          if (Array.isArray(findDataError)) {
            // Error is an array of error objects
            errorMessage = findDataError.map((err, idx) => {
              if (err && typeof err === 'object') {
                const msg = err.message || err.error || JSON.stringify(err);
                return `[${idx}]: ${msg}`;
              }
              return String(err);
            }).join(', ');
            errorDetails = findDataError;
          } else if (findDataError.errors && Array.isArray(findDataError.errors)) {
            // Error has an errors array
            errorMessage = findDataError.errors.map((err, idx) => {
              if (err && typeof err === 'object') {
                const msg = err.message || err.error || JSON.stringify(err);
                return `[${idx}]: ${msg}`;
              }
              return String(err);
            }).join(', ');
            errorDetails = findDataError.errors;
          } else if (findDataError.message) {
            errorMessage = findDataError.message;
          } else if (findDataError.error) {
            errorMessage = String(findDataError.error);
          } else {
            errorMessage = JSON.stringify(findDataError);
          }
        } else if (findDataError) {
          errorMessage = String(findDataError);
        }

        logger.error('findData query failed for all credentials', {
          collectionId,
          error: errorMessage,
          errorType: typeof findDataError,
          isArray: Array.isArray(findDataError),
          errorDetails: errorDetails ? JSON.stringify(errorDetails).substring(0, 500) : null,
          fullError: JSON.stringify(findDataError).substring(0, 1000)
        });
        
        // If findData doesn't support querying all records, return empty array
        // This is better than crashing - the user can still use the app
        logger.warn('findData may not support querying all records without a filter. Returning empty list.');
        return {
          credentials: [],
          total: 0,
          limit,
          offset,
          hasMore: false
        };
      }

    } catch (error) {
      logger.error('Failed to get all credentials from NillionDB', {
        error: error.message || String(error)
      });
      throw error;
    }
  }

  /**
   * Delete a credential from NillionDB by record ID (_id)
   */
  async deleteCredential(recordId) {
    try {
      await this.initializationPromise;
      if (!this.builderClient) {
        throw new Error('Nillion builder client not initialized');
      }

      const collectionId = '3689f760-a7ea-4acb-813a-4e43495180d9';
      
      logger.info('Deleting credential from NillionDB', { 
        collectionId,
        recordId
      });

      try {
        // Use deleteData method from SDK
        const result = await this.builderClient.deleteData({
          collection: collectionId,
          filter: {
            _id: recordId
          }
        });

        logger.info('Delete result from NillionDB', { 
          collectionId,
          recordId,
          result
        });

        return {
          success: true,
          recordId,
          message: 'Credential deleted successfully'
        };

      } catch (deleteError) {
        logger.error('deleteData failed', {
          collectionId,
          recordId,
          error: deleteError.message
        });
        throw deleteError;
      }

    } catch (error) {
      logger.error('Failed to delete credential from NillionDB', {
        recordId,
        error: error.message || String(error)
      });
      throw error;
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
