import { ReactNode } from 'react'
import Link from 'next/link'
import { 
  ShieldCheckIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">NillionVault</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <DocumentTextIcon className="h-5 w-5" />
                <span>Upload</span>
              </Link>
              <Link 
                href="/verify" 
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Verify</span>
              </Link>
              <Link 
                href="/about" 
                className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
              >
                <InformationCircleIcon className="h-5 w-5" />
                <span>About</span>
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                type="button"
                className="text-gray-700 hover:text-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md p-2"
                aria-label="Open menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                About
              </h3>
              <p className="text-sm text-gray-600">
                NillionVault provides secure credential storage using Nillion SecretVaults 
                and blockchain anchoring for immutable verification.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="https://docs.nillion.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Nillion Documentation
                  </a>
                </li>
                <li>
                  <a 
                    href="https://testnet.nillion.explorers.guru" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Testnet Explorer
                  </a>
                </li>
                <li>
                  <a 
                    href="/tools/hash.js" 
                    className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                  >
                    Hash Verification Tool
                  </a>
                </li>
              </ul>
            </div>

            {/* Security */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Security
              </h3>
              <ul className="space-y-2">
                <li className="text-sm text-gray-600">
                  ✅ Encrypted Storage
                </li>
                <li className="text-sm text-gray-600">
                  ✅ Blockchain Anchoring
                </li>
                <li className="text-sm text-gray-600">
                  ✅ Public Verification
                </li>
                <li className="text-sm text-gray-600">
                  ✅ Immutable Records
                </li>
              </ul>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
                Network Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Nillion Testnet</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-success-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">SecretVaults</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-warning-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">Anchoring Queue</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-gray-600">
                © 2024 NillionVault. Built with Nillion, Supabase, and Upstash.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  GitHub
                </a>
                <a 
                  href="/privacy" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Privacy
                </a>
                <a 
                  href="/terms" 
                  className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Terms
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
