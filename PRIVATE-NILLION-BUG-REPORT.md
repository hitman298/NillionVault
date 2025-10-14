# 🐛 PRIVATE: Nillion SDK Bug Report

**DO NOT COMMIT TO GITHUB - SHARE DIRECTLY WITH NILLION TEAM**

## Bug Summary
`@nillion/secretvaults@0.1.6` fails when storing plaintext-only data despite documentation stating this should work.

## Error
```
TypeError: Cannot convert undefined or null to object
    at findAllotPathsAndValues (lib.js:242:17)
    at prepareRequest (lib.js:261:18)
    at createStandardData (lib.js:1555:32)
```

## Documentation Says
> "You can create collections and records with only plaintext fields (no %allot required)"

## Reproduction
```javascript
// This crashes the SDK
const recordData = [{
  _id: randomUUID(),
  title: 'Test Document',        // plaintext only
  description: 'Plaintext data', // plaintext only
  created_at: new Date().toISOString()
}];

await builder.createStandardData(collectionId, recordData);
```

## Impact
- Cannot store metadata alongside encrypted data
- Forces use of external storage for plaintext fields
- Affects document management use cases

## Environment
- SDK: @nillion/secretvaults@0.1.6
- Testnet: rpc.testnet.nilchain-rpc-proxy.nilogy.xyz
- nilDB: nildb-stg-n1/2/3.nillion.network

## Suggested Fix
`findAllotPathsAndValues` should handle plaintext-only data gracefully instead of crashing on `Object.entries(null/undefined)`.

---
**Contact**: [Your GitHub/Email] for reproduction details
