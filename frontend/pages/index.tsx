import { useState } from 'react'
import Head from 'next/head'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { 
  CloudArrowUpIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

import { api } from '../lib/api'
import { computeHash } from '../lib/hash'
import Layout from '../components/Layout'
import UploadProgress from '../components/UploadProgress'
import VerificationPanel from '../components/VerificationPanel'

interface UploadResult {
  credentialId: string
  proofHash: string
  vaultId?: string
  status: string
  message: string
}

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [proofHash, setProofHash] = useState<string>('')
  const [jsonData, setJsonData] = useState('')
  const [uploadType, setUploadType] = useState<'file' | 'json'>('file')

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    await handleFileUpload(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadResult(null)

    try {
      // Compute proof hash on client side
      const hash = await computeHash(file)
      setProofHash(hash)

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name)
      formData.append('description', `Uploaded file: ${file.name}`)
      formData.append('clientProofHash', hash)

      const result = await api.uploadCredential(formData)
      setUploadResult(result)
      toast.success('Credential uploaded successfully!')

    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleJsonUpload = async () => {
    if (!jsonData.trim()) {
      toast.error('Please enter JSON data')
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      // Parse and validate JSON
      const parsed = JSON.parse(jsonData)
      
      // Compute proof hash
      const hash = await computeHash(parsed)
      setProofHash(hash)

      // Upload JSON
      const formData = new FormData()
      formData.append('jsonData', JSON.stringify(parsed))
      formData.append('title', 'JSON Credential')
      formData.append('description', 'JSON data credential')
      formData.append('clientProofHash', hash)

      const result = await api.uploadCredential(formData)
      setUploadResult(result)
      toast.success('JSON credential uploaded successfully!')

    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format')
      } else {
        console.error('Upload error:', error)
        toast.error(error.response?.data?.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Head>
        <title>NillionVault - Secure Credential Anchoring</title>
        <meta name="description" content="Store credentials securely in Nillion SecretVaults and anchor proof hashes to the blockchain" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-4">
              <ShieldCheckIcon className="h-16 w-16 text-primary-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              NillionVault
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Store your credentials securely in Nillion SecretVaults and anchor proof hashes 
              to the blockchain for immutable verification.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
              <CloudArrowUpIcon className="h-12 w-12 text-primary-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Encrypted Storage</h3>
              <p className="text-gray-600">
                Your data is encrypted and stored in Nillion SecretVaults, 
                ensuring maximum privacy and security.
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
              <GlobeAltIcon className="h-12 w-12 text-success-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Blockchain Anchoring</h3>
              <p className="text-gray-600">
                Proof hashes are anchored to the Nillion testnet blockchain 
                for public verification and immutability.
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
              <CheckCircleIcon className="h-12 w-12 text-warning-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Public Verification</h3>
              <p className="text-gray-600">
                Anyone can verify your credentials using the proof hash 
                and blockchain explorer.
              </p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="card p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Credential</h2>
            
            {/* Upload Type Tabs */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setUploadType('file')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  uploadType === 'file'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                File Upload
              </button>
              <button
                onClick={() => setUploadType('json')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  uploadType === 'json'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                JSON Data
              </button>
            </div>

            {/* File Upload */}
            {uploadType === 'file' && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-lg text-primary-600">Drop the file here...</p>
                ) : (
                  <div>
                    <p className="text-lg text-gray-600 mb-2">
                      Drag & drop a file here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports JSON, PDF, images, and text files (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* JSON Upload */}
            {uploadType === 'json' && (
              <div className="space-y-4">
                <div>
                  <label className="label">JSON Data</label>
                  <textarea
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    placeholder='{"name": "John Doe", "email": "john@example.com", "credentials": {...}}'
                    className="textarea h-32"
                  />
                </div>
                <button
                  onClick={handleJsonUpload}
                  disabled={uploading || !jsonData.trim()}
                  className="btn-primary w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload JSON'}
                </button>
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <UploadProgress proofHash={proofHash} />
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Upload Complete
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 status-${uploadResult.status}`}>
                    {uploadResult.status}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Proof Hash:</span>
                  <div className="hash-display mt-1">{uploadResult.proofHash}</div>
                </div>
                {uploadResult.vaultId && (
                  <div>
                    <span className="font-medium text-gray-700">Vault ID:</span>
                    <div className="hash-display mt-1">{uploadResult.vaultId}</div>
                  </div>
                )}
                <p className="text-sm text-gray-600 mt-4">
                  {uploadResult.message}
                </p>
              </div>
            </div>
          )}

          {/* Verification Panel */}
          {uploadResult && (
            <VerificationPanel credentialId={uploadResult.credentialId} />
          )}
        </div>
      </Layout>
    </>
  )
}
