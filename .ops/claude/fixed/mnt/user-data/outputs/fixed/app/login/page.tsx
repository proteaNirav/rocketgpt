'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useSearchParams, useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  // Show error from URL params (e.g., from callback)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  // Initialize guest session via server action
  useEffect(() => {
    initializeGuest()
  }, [])

  async function initializeGuest() {
    try {
      const response = await fetch('/api/guest', { 
        method: 'POST',
        credentials: 'include'
      })
      if (!response.ok) {
        console.error('Failed to initialize guest session')
      }
    } catch (err) {
      console.error('Guest initialization error:', err)
    }
  }

  async function sendOtp() {
    setError(null)
    setLoading(true)
    
    try {
      const redirectTo = searchParams.get('redirectedFrom') || searchParams.get('next') || '/account'
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}` 
        },
      })
      
      if (error) {
        setError(error.message)
      } else {
        setOtpSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    setError(null)
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.verifyOtp({ 
        email, 
        token: otp, 
        type: 'email' 
      })
      
      if (error) {
        setError(error.message)
      } else {
        // Let middleware handle the redirect after session is established
        const redirectTo = searchParams.get('redirectedFrom') || searchParams.get('next') || '/account'
        router.push(redirectTo)
      }
    } finally {
      setLoading(false)
    }
  }

  async function oauth(provider: 'google' | 'github') {
    setError(null)
    setLoading(true)
    
    try {
      const redirectTo = searchParams.get('redirectedFrom') || searchParams.get('next') || '/account'
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { 
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      })
      
      if (error) {
        setError(error.message)
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'OAuth error')
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      {!otpSent ? (
        <>
          <input
            className="w-full border rounded p-2"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <button 
            onClick={sendOtp} 
            className="w-full rounded bg-black text-white p-2 mt-2 disabled:opacity-50"
            disabled={loading || !email}
          >
            {loading ? 'Sending...' : 'Send OTP Code'}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => oauth('google')} 
              className="flex-1 border rounded p-2 disabled:opacity-50"
              disabled={loading}
            >
              Google
            </button>
            <button 
              onClick={() => oauth('github')} 
              className="flex-1 border rounded p-2 disabled:opacity-50"
              disabled={loading}
            >
              GitHub
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to {email}
          </p>
          <input
            className="w-full border rounded p-2"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={loading}
            maxLength={6}
          />
          <button 
            onClick={verifyOtp} 
            className="w-full rounded bg-black text-white p-2 mt-2 disabled:opacity-50"
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <button
            onClick={() => {
              setOtpSent(false)
              setOtp('')
              setError(null)
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to email
          </button>
        </>
      )}
    </div>
  )
}
