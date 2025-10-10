import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 500) {
      console.error('Server error:', error.response.data)
    }
    return Promise.reject(error)
  }
)

export interface UploadCredentialResponse {
  success: boolean
  credentialId: string
  proofHash: string
  vaultId?: string
  status: string
  message: string
}

export interface Credential {
  id: string
  title: string
  description?: string
  proof_hash: string
  status: string
  created_at: string
  file_name?: string
  file_type?: string
  size_bytes?: number
  anchors?: Anchor[]
}

export interface Anchor {
  id: string
  tx_hash: string
  status: string
  block_height?: number
  tx_time?: string
  explorer_url?: string
}

export interface VerificationResult {
  success: boolean
  exists: boolean
  credential?: Credential
  anchoring?: {
    anchored: boolean
    anchor_count: number
    latest_anchor?: Anchor
  }
  verification?: {
    proof_hash_matches: boolean
    blockchain_verified: boolean
    blockchain_data?: any
  }
}

export const apiClient = {
  // Credential operations
  uploadCredential: async (formData: FormData): Promise<UploadCredentialResponse> => {
    const response = await api.post('/api/credentials/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getCredential: async (credentialId: string): Promise<{ success: boolean; credential: Credential }> => {
    const response = await api.get(`/api/credentials/${credentialId}`)
    return response.data
  },

  getUserCredentials: async (userId: string, limit = 50, offset = 0) => {
    const response = await api.get(`/api/credentials/user/${userId}`, {
      params: { limit, offset }
    })
    return response.data
  },

  verifyCredential: async (proofHash: string): Promise<VerificationResult> => {
    const response = await api.post('/api/credentials/verify', { proofHash })
    return response.data
  },

  // Anchor operations
  getAnchor: async (anchorId: string) => {
    const response = await api.get(`/api/anchors/${anchorId}`)
    return response.data
  },

  getAnchorByTxHash: async (txHash: string) => {
    const response = await api.get(`/api/anchors/tx/${txHash}`)
    return response.data
  },

  getAnchorStatus: async () => {
    const response = await api.get('/api/anchors/status')
    return response.data
  },

  // Verification operations
  computeHash: async (data: any, type: 'json' | 'binary' = 'json') => {
    const response = await api.post('/api/verification/compute-hash', { data, type })
    return response.data
  },

  verifyProof: async (proofHash: string): Promise<VerificationResult> => {
    const response = await api.post('/api/verification/verify-proof', { proofHash })
    return response.data
  },

  getVerificationTools: async () => {
    const response = await api.get('/api/verification/tools')
    return response.data
  },

  getCredentialVerification: async (credentialId: string) => {
    const response = await api.get(`/api/verification/credential/${credentialId}`)
    return response.data
  },

  exportVerification: async (credentialId: string) => {
    const response = await api.get(`/api/verification/export/${credentialId}`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health')
    return response.data
  }
}

export { api }
