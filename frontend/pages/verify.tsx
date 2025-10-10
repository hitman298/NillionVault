import { useState } from 'react'
import Head from 'next/head'
import toast from 'react-hot-toast'
import { 
  MagnifyingGlassIcon, 
  ClipboardDocumentIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

import Layout from '../components/Layout'
import { apiClient } from '../lib/api'
import { computeHash, copyToClipboard, formatHash } from '../lib/hash'

export default function Verify() {
  const [proofHash, setProofHash] = useState('')
  const [verification, setVerification] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerifyHash = async () => {
    if (!proofHash.trim()) {
      toast.error('Please enter a proof hash')
      return
    }

    setLoading(true)
    setError(null)
    setVerification(null)

    try {
      const result = await apiClient.verifyProof(proofHash)
      setVerification(result)
      
      if (result.exists) {
        toast.success('Credential found and verified!')
      } else {
        toast.error('Credential not found')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed')
      toast.error('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyHash = async () => {
    if (proofHash) {
      const success = await copyToClipboard(proofHash)
      if (success) {
        toast.success('Proof hash copied to clipboard')
      } else {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  const handleOpenExplorer = (txHash: string) => {
    const explorerUrl = `https://testnet.nillion.explorers.guru/tx/${txHash}`
    window.open(explorerUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <Head>
        <title>Verify Credential - NillionVault</title>
        <meta name="description" content="Verify credential authenticity using proof hash and blockchain explorer" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <MagnifyingGlassIcon className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Verify Credential
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Enter a proof hash to verify the authenticity and anchoring status 
              of a credential stored in NillionVault.
            </p>
          </div>

          {/* Verification Form */}
          <div className="card p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Enter Proof Hash
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Proof Hash</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={proofHash}
                    onChange={(e) => setProofHash(e.target.value)}
                    placeholder="Enter 64-character hex proof hash..."
                    className="input flex-1 font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyHash}
                    disabled={!proofHash}
                    className="btn-secondary"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  The proof hash is a 64-character hexadecimal string that uniquely identifies a credential
                </p>
              </div>

              <button
                onClick={handleVerifyHash}
                disabled={loading || !proofHash.trim()}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Verify Credential
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="card p-6 mb-8 border-danger-200 bg-danger-50">
              <div className="flex items-center space-x-2 text-danger-600">
                <XCircleIcon className="h-5 w-5" />
                <span>Error: {error}</span>
              </div>
            </div>
          )}

          {/* Verification Results */}
          {verification && (
            <div className="space-y-6">
              {verification.exists ? (
                <>
                  {/* Credential Details */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Credential Details
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Title:</span>
                        <p className="text-gray-900 mt-1">{verification.credential.title}</p>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className={`status-${verification.credential.status} ml-2`}>
                          {verification.credential.status}
                        </span>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Created:</span>
                        <p className="text-gray-900 mt-1">
                          {new Date(verification.credential.created_at).toLocaleString()}
                        </p>
                      </div>
                      
                      {verification.credential.file_name && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">File:</span>
                          <p className="text-gray-900 mt-1">{verification.credential.file_name}</p>
                        </div>
                      )}
                    </div>

                    {verification.credential.description && (
                      <div className="mt-4">
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <p className="text-gray-900 mt-1">{verification.credential.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Anchoring Status */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Blockchain Anchoring
                    </h3>
                    
                    {verification.anchoring.anchored ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-5 w-5 text-success-600" />
                          <span className="text-success-600 font-medium">
                            Credential is anchored to the blockchain
                          </span>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Anchors: {verification.anchoring.anchor_count}
                            </span>
                            {verification.anchoring.latest_anchor?.explorer_url && (
                              <button
                                onClick={() => handleOpenExplorer(verification.anchoring.latest_anchor.tx_hash)}
                                className="btn-secondary text-sm"
                              >
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                View on Explorer
                              </button>
                            )}
                          </div>
                          
                          {verification.anchoring.latest_anchor && (
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium text-gray-700">Latest Transaction:</span>
                                <div className="tx-hash mt-1">
                                  {formatHash(verification.anchoring.latest_anchor.tx_hash)}
                                </div>
                              </div>
                              
                              {verification.anchoring.latest_anchor.block_height && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Block Height:</span>
                                  <span className="text-gray-900 ml-2">
                                    {verification.anchoring.latest_anchor.block_height}
                                  </span>
                                </div>
                              )}
                              
                              {verification.anchoring.latest_anchor.tx_time && (
                                <div>
                                  <span className="text-sm font-medium text-gray-700">Timestamp:</span>
                                  <span className="text-gray-900 ml-2">
                                    {new Date(verification.anchoring.latest_anchor.tx_time).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-warning-600">
                        <ClockIcon className="h-5 w-5" />
                        <span>Credential is not yet anchored to the blockchain</span>
                      </div>
                    )}
                  </div>

                  {/* Verification Summary */}
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Verification Summary
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Proof Hash Matches:</span>
                        <div className="flex items-center space-x-2">
                          {verification.verification.proof_hash_matches ? (
                            <CheckCircleIcon className="h-5 w-5 text-success-600" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-danger-600" />
                          )}
                          <span className={verification.verification.proof_hash_matches ? 'text-success-600' : 'text-danger-600'}>
                            {verification.verification.proof_hash_matches ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Blockchain Verified:</span>
                        <div className="flex items-center space-x-2">
                          {verification.verification.blockchain_verified ? (
                            <CheckCircleIcon className="h-5 w-5 text-success-600" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-danger-600" />
                          )}
                          <span className={verification.verification.blockchain_verified ? 'text-success-600' : 'text-danger-600'}>
                            {verification.verification.blockchain_verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card p-6 text-center">
                  <XCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Credential Not Found
                  </h3>
                  <p className="text-gray-600">
                    No credential found with the provided proof hash. Please verify the hash is correct.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="card p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              How to Verify Credentials
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Get the proof hash</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    The proof hash is provided when a credential is uploaded or can be computed from the original file
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Enter the hash above</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Paste the 64-character hexadecimal proof hash in the input field
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Review verification results</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Check the credential details, anchoring status, and blockchain verification
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Verify on blockchain explorer</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Click "View on Explorer" to independently verify the transaction on the testnet
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}
