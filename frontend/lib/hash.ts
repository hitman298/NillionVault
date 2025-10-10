import CryptoJS from 'crypto-js'

/**
 * Canonicalize an object by sorting keys recursively
 * This ensures deterministic JSON output for consistent hashing
 */
function canonicalize(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(canonicalize)
  }
  
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort()
    const out: any = {}
    for (const key of keys) {
      out[key] = canonicalize(obj[key])
    }
    return out
  }
  
  return obj
}

/**
 * Compute SHA256 hash of a string and return hex-encoded result
 */
function sha256Hex(str: string): string {
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex)
}

/**
 * Compute proof hash for JSON data
 */
function computeJsonProofHash(jsonData: any): string {
  try {
    // Canonicalize to ensure deterministic output
    const canonical = canonicalize(jsonData)
    
    // Convert back to JSON with no whitespace
    const canonicalJson = JSON.stringify(canonical)
    
    // Compute SHA256 hash
    return sha256Hex(canonicalJson)
  } catch (error) {
    throw new Error(`Failed to compute JSON proof hash: ${error}`)
  }
}

/**
 * Compute proof hash for file data
 */
async function computeBinaryProofHash(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer)
        const hash = CryptoJS.SHA256(wordArray)
        resolve(hash.toString(CryptoJS.enc.Hex))
      } catch (error) {
        reject(new Error(`Failed to compute binary proof hash: ${error}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Compute proof hash for file or JSON data (auto-detects)
 */
export async function computeHash(data: File | any): Promise<string> {
  try {
    if (data instanceof File) {
      // It's a file, compute binary hash
      return await computeBinaryProofHash(data)
    } else {
      // It's JSON data, compute JSON hash
      return computeJsonProofHash(data)
    }
  } catch (error) {
    throw new Error(`Failed to compute proof hash: ${error}`)
  }
}

/**
 * Verify that a computed hash matches a given hash
 */
export function verifyHash(computedHash: string, expectedHash: string): boolean {
  return computedHash.toLowerCase() === expectedHash.toLowerCase()
}

/**
 * Format hash for display (truncate with ellipsis)
 */
export function formatHash(hash: string, startChars = 8, endChars = 8): string {
  if (hash.length <= startChars + endChars) {
    return hash
  }
  return `${hash.substring(0, startChars)}...${hash.substring(hash.length - endChars)}`
}

/**
 * Copy hash to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (fallbackError) {
      document.body.removeChild(textArea)
      return false
    }
  }
}

export {
  canonicalize,
  sha256Hex,
  computeJsonProofHash,
  computeBinaryProofHash
}
