import { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon, 
  ClipboardDocumentIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

import { apiClient, Anchor } from '../lib/api'
import { copyToClipboard, formatHash } from '../lib/hash'

interface VerificationPanelProps {
  credentialId: string
}

export default function VerificationPanel({ credentialId }: VerificationPanelProps) {
  const [verification, setVerification] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadVerification()
    
    // Poll for updates every 10 seconds
    const interval = setInterval(loadVerification, 10000)
    return () => clearInterval(interval)
  }, [credentialId])

  const loadVerification = async () => {
    try {
      const result = await apiClient.getCredentialVerification(credentialId)
      setVerification(result)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load verification')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyHash = async () => {
    if (verification?.credential?.proof_hash) {
      const success = await copyToClipboard(verification.credential.proof_hash)
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

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-2 text-danger-600">
          <XCircleIcon className="h-5 w-5" />
          <span>Error loading verification: {error}</span>
        </div>
      </div>
    )
  }

  const { credential, anchors, verification_summary } = verification

  return (
    <div className="space-y-6">
      {/* Verification Status */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Verification Status
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Credential Status */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <CheckCircleIcon className="h-8 w-8 text-success-600" />
            </div>
            <h4 className="font-medium text-gray-900">Credential Stored</h4>
            <p className="text-sm text-gray-600 mt-1">
              Encrypted in Nillion SecretVault
            </p>
          </div>

          {/* Anchoring Status */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-2">
              {verification_summary.confirmed_anchors > 0 ? (
                <CheckCircleIcon className="h-8 w-8 text-success-600" />
              ) : verification_summary.pending_anchors > 0 ? (
                <ClockIcon className="h-8 w-8 text-warning-600" />
              ) : (
                <XCircleIcon className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h4 className="font-medium text-gray-900">Blockchain Anchoring</h4>
            <p className="text-sm text-gray-600 mt-1">
              {verification_summary.confirmed_anchors > 0 
                ? `${verification_summary.confirmed_anchors} confirmed`
                : verification_summary.pending_anchors > 0
                ? 'Pending confirmation'
                : 'Not anchored yet'
              }
            </p>
          </div>

          {/* Verification Available */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-center mb-2">
              <CheckCircleIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h4 className="font-medium text-gray-900">Public Verification</h4>
            <p className="text-sm text-gray-600 mt-1">
              Proof hash available for verification
            </p>
          </div>
        </div>
      </div>

      {/* Proof Hash */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Proof Hash</h3>
          <button
            onClick={handleCopyHash}
            className="btn-secondary text-sm"
          >
            <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
            Copy
          </button>
        </div>
        
        <div className="hash-display mb-3">{credential.proof_hash}</div>
        
        <p className="text-sm text-gray-600">
          This hash uniquely identifies your credential. Anyone can use this hash to verify 
          the authenticity of your credential by checking the blockchain anchor.
        </p>
      </div>

      {/* Anchoring Details */}
      {anchors.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Blockchain Anchors ({anchors.length})
          </h3>
          
          <div className="space-y-4">
            {anchors.map((anchor: Anchor) => (
              <div key={anchor.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`status-${anchor.status} px-3 py-1`}>
                      {anchor.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {anchor.block_height ? `Block ${anchor.block_height}` : 'Pending'}
                    </span>
                  </div>
                  
                  {anchor.explorer_url && (
                    <button
                      onClick={() => handleOpenExplorer(anchor.tx_hash)}
                      className="btn-secondary text-sm"
                    >
                      <ExternalLinkIcon className="h-4 w-4 mr-2" />
                      View on Explorer
                    </button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Transaction Hash:</span>
                    <div className="tx-hash mt-1" onClick={() => copyToClipboard(anchor.tx_hash)}>
                      {formatHash(anchor.tx_hash)}
                    </div>
                  </div>
                  
                  {anchor.tx_time && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Timestamp:</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {new Date(anchor.tx_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Instructions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          How to Verify This Credential
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Download the hash verification tool</h4>
              <p className="text-sm text-gray-600 mt-1">
                Get the canonicalization script from{' '}
                <a href="/tools/hash.js" className="text-primary-600 hover:text-primary-800">
                  /tools/hash.js
                </a>
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Compute proof hash from your original file</h4>
              <p className="text-sm text-gray-600 mt-1">
                Run: <code className="bg-gray-100 px-2 py-1 rounded">node hash.js your-file</code>
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Compare with the proof hash above</h4>
              <p className="text-sm text-gray-600 mt-1">
                The computed hash should match exactly
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
                Click "View on Explorer" to see the transaction containing this proof hash
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
