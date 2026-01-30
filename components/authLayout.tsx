'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import AuthFooter from './authFooter'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const pathname = usePathname()
  const isSignIn = pathname === '/login'

  return (
    <main>
    <div className="flex mt-30 items-center justify-center">
      <div className="w-full max-w-md">
        {/* Welcome Header */}
        <h1 className="mb-10 text-center text-4xl font-bold text-(--exness-text)">
          Welcome to Exness
        </h1>

        {/* Tabs */}
        <div className="mb-5 flex border-b border-gray-700">
          <Link
            href="/login"
            className={`flex-1 pb-4 text-center text-base font-medium transition-colors ${
              isSignIn
                ? 'border-b-2 border-(--exness-text) text-(--exness-text)'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={`flex-1 pb-4 text-center text-base font-medium transition-colors ${
              !isSignIn
                ? 'border-b-2 border-(--exness-text) text-(--exness-text)'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Create an account
          </Link>
        </div>

        {/* Form Content */}
        {children}
      </div>
    </div>
    <div>
      <AuthFooter />
    </div>
    </main>
  )
}