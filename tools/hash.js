#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Canonicalize an object by sorting keys recursively
 * This ensures deterministic JSON output for consistent hashing
 */
function canonicalize(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const out = {};
    for (const key of keys) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  
  return obj;
}

/**
 * Compute SHA256 hash of a string and return hex-encoded result
 */
function sha256Hex(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Compute proof hash for JSON data
 */
function computeJsonProofHash(jsonData) {
  try {
    // Parse if string, otherwise use as-is
    const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // Canonicalize to ensure deterministic output
    const canonical = canonicalize(parsed);
    
    // Convert back to JSON with no whitespace
    const canonicalJson = JSON.stringify(canonical);
    
    // Compute SHA256 hash
    return sha256Hex(canonicalJson);
  } catch (error) {
    throw new Error(`Failed to compute JSON proof hash: ${error.message}`);
  }
}

/**
 * Compute proof hash for binary file data
 */
function computeBinaryProofHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute proof hash for file (auto-detects JSON vs binary)
 */
function computeFileProofHash(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    
    // Try to parse as JSON first
    try {
      const content = buffer.toString('utf8');
      const jsonData = JSON.parse(content);
      return computeJsonProofHash(jsonData);
    } catch (jsonError) {
      // Not JSON, treat as binary
      return computeBinaryProofHash(buffer);
    }
  } catch (error) {
    throw new Error(`Failed to compute file proof hash: ${error.message}`);
  }
}

/**
 * CLI interface for computing proof hashes
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node hash.js <file-path>');
    console.log('       node hash.js --json \'{"key": "value"}\'');
    console.log('');
    console.log('Examples:');
    console.log('  node hash.js credentials.json');
    console.log('  node hash.js document.pdf');
    console.log('  node hash.js --json \'{"name": "John", "age": 30}\'');
    process.exit(1);
  }
  
  try {
    let proofHash;
    
    if (args[0] === '--json') {
      if (args.length < 2) {
        console.error('Error: --json requires JSON string argument');
        process.exit(1);
      }
      proofHash = computeJsonProofHash(args[1]);
    } else {
      const filePath = args[0];
      if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found: ${filePath}`);
        process.exit(1);
      }
      proofHash = computeFileProofHash(filePath);
    }
    
    console.log(`Proof Hash: ${proofHash}`);
    console.log('');
    console.log('To verify this anchor:');
    console.log('1. Go to https://testnet.nillion.explorers.guru');
    console.log('2. Search for the transaction hash containing this proof hash');
    console.log('3. Verify the memo/data field matches this hash');
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  canonicalize,
  sha256Hex,
  computeJsonProofHash,
  computeBinaryProofHash,
  computeFileProofHash
};
