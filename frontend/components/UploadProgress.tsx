import { useEffect, useState } from 'react'
import { 
  CloudArrowUpIcon, 
  ShieldCheckIcon, 
  ClockIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

interface UploadProgressProps {
  proofHash: string
}

export default function UploadProgress({ proofHash }: UploadProgressProps) {
  const [currentStep, setCurrentStep] = useState(0)
  
  const steps = [
    {
      id: 1,
      name: 'Computing Hash',
      description: 'Generating cryptographic proof hash',
      icon: CheckCircleIcon,
      status: 'completed'
    },
    {
      id: 2,
      name: 'Uploading File',
      description: 'Transferring file to server',
      icon: CloudArrowUpIcon,
      status: 'current'
    },
    {
      id: 3,
      name: 'Storing in Vault',
      description: 'Encrypting and storing in Nillion SecretVault',
      icon: ShieldCheckIcon,
      status: 'upcoming'
    },
    {
      id: 4,
      name: 'Queueing Anchor',
      description: 'Adding to blockchain anchoring queue',
      icon: ClockIcon,
      status: 'upcoming'
    }
  ]

  useEffect(() => {
    // Simulate progress through steps
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < steps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="card p-6 mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Upload Progress
      </h3>

      {/* Proof Hash Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Proof Hash:</span>
          <button
            onClick={() => navigator.clipboard.writeText(proofHash)}
            className="text-xs text-primary-600 hover:text-primary-800 transition-colors"
          >
            Copy
          </button>
        </div>
        <div className="hash-display">{proofHash}</div>
        <p className="text-xs text-gray-500 mt-2">
          This hash uniquely identifies your credential and will be anchored to the blockchain
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-4">
        {steps.map((step, stepIdx) => {
          const Icon = step.icon
          let status = 'upcoming'
          
          if (stepIdx < currentStep) {
            status = 'completed'
          } else if (stepIdx === currentStep) {
            status = 'current'
          }

          return (
            <div key={step.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    status === 'completed'
                      ? 'bg-success-500 border-success-500 text-white'
                      : status === 'current'
                      ? 'bg-primary-500 border-primary-500 text-white animate-pulse'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p
                    className={`text-sm font-medium ${
                      status === 'current' ? 'text-primary-600' : 'text-gray-900'
                    }`}
                  >
                    {step.name}
                  </p>
                  {status === 'current' && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-600"></div>
                  )}
                </div>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Status Message */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="animate-pulse rounded-full h-2 w-2 bg-blue-600"></div>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Your credential is being processed. You'll receive confirmation once it's 
              uploaded, stored in the vault, and queued for blockchain anchoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
