# 🐛 Nillion SDK Bug Report: findAllotPathsAndValues fails with plaintext-only data

## **Bug Summary**
The `@nillion/secretvaults@0.1.6` SDK fails when attempting to store plaintext-only data in collections, despite documentation stating this should work.

## **Error Details**
```
TypeError: Cannot convert undefined or null to object
    at Function.entries (<anonymous>)
    at findAllotPathsAndValues (file:///X:/NillionVault/backend/node_modules/@nillion/secretvaults/dist/lib.js:242:17)
    at prepareRequest (file:///X:/NillionVault/backend/node_modules/@nillion/secretvaults/dist/lib.js:261:18)
    at _SecretVaultBuilderClient.createStandardData (file:///X:/NillionVault/backend/node_modules/@nillion/secretvaults/dist/lib.js:1555:32)
```

## **Expected Behavior (Per Documentation)**
According to the official documentation:

> **"You can create collections and records with only plaintext fields (no %allot required)"**

Example from docs:
```javascript
const recordData = [
  {
    _id: randomUUID(),
    name: 'Steph', // plaintext
    phone_number: { '%allot': '555-555-5555' }, // encrypted
  },
];
// But you can omit the encrypted field and just use plaintext fields
```

## **Actual Behavior**
When attempting to store data with only plaintext fields, the SDK crashes at `findAllotPathsAndValues` function.

## **Reproduction Steps**

### 1. Setup Collection (Plaintext Only)
```javascript
const collection = {
  _id: randomUUID(),
  type: 'standard',
  name: 'Plaintext Test Collection',
  schema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'array',
    uniqueItems: true,
    items: {
      type: 'object',
      properties: {
        _id: { type: 'string', format: 'uuid' },
        title: { type: 'string' }, // Plaintext only
        description: { type: 'string' }, // Plaintext only
        created_at: { type: 'string' }, // Plaintext only
      },
      required: ['_id', 'title', 'description', 'created_at'],
    },
  },
};
```

### 2. Attempt to Store Plaintext Data
```javascript
const recordData = [
  {
    _id: randomUUID(),
    title: 'Test Document',
    description: 'This is a test document with plaintext only',
    created_at: new Date().toISOString(),
  },
];

// This crashes with findAllotPathsAndValues error
const result = await builder.createStandardData(collectionId, recordData);
```

## **Environment**
- **SDK Version**: `@nillion/secretvaults@0.1.6`
- **Environment**: Nillion Testnet
- **Node.js**: 22.x
- **Chain URL**: `http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz`
- **Auth URL**: `https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz`
- **nilDB Nodes**: `https://nildb-stg-n1.nillion.network,https://nildb-stg-n2.nillion.network,https://nildb-stg-n3.nillion.network`

## **Impact**
- **High**: Cannot store plaintext-only data as documented
- **Workaround**: Must use external storage (Supabase) for plaintext data
- **Affects**: Any application trying to store non-sensitive metadata

## **Attempted Workarounds**
1. **Adding dummy encrypted field**: Also fails with same error
2. **Different data structures**: Same error persists
3. **Collection schema variations**: No success

## **Suggested Fix**
The `findAllotPathsAndValues` function should handle cases where:
1. No `%allot` fields are present in the data
2. Data contains only plaintext fields
3. The function should return empty results instead of crashing

## **Code Location**
Bug is in the SDK's internal `findAllotPathsAndValues` function at line 242 in `lib.js`, specifically when calling `Object.entries()` on undefined/null data.

## **Test Results**
```
✅ Collection creation: Works
❌ Plaintext-only storage: Fails with findAllotPathsAndValues
❌ Dummy encrypted field workaround: Also fails
✅ External storage (Supabase): Works as alternative
```

## **Related Issues**
This affects the core functionality of storing metadata alongside encrypted data, which is a common use case for document management systems.

---
**Reported by**: NillionVault Team  
**Date**: October 14, 2025  
**Project**: [NillionVault](https://github.com/hitman298/NillionVault) - Production document storage platform
