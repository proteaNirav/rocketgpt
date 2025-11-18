'use client'

import { useEffect, useMemo, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')

  // singleton Supabase client
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  async function sendOtp() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account` },
    })
    if (error) alert(error.message)
    else setOtpSent(true)
  }

  async function verifyOtp() {
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error) alert(error.message)
    else {
      const guestId = getCookie('guest_id')
      if (guestId) await supabase.rpc('migrate_guest_data', { p_guest_id: guestId })
      window.location.href = '/account'
    }
  }

  async function oauth(provider: 'google' | 'azure') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account` },
    })
    if (error) alert(error.message)
  }

  // ensure guest cookie exists
  useEffect(() => {
    fetch('/api/guest', { method: 'POST' }).catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {!otpSent ? (
        <>
          <input
            className="w-full border rounded p-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button onClick={sendOtp} className="w-full rounded bg-black text-white p-2 mt-2">
            Send OTP Code
          </button>

          <div className="flex gap-2 pt-4">
            <button onClick={() => oauth('google')} className="flex-1 border rounded p-2">
              Continue with Google
            </button>
            <button onClick={() => oauth('azure')} className="flex-1 border rounded p-2">
              Continue with Microsoft
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            className="w-full border rounded p-2"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={verifyOtp} className="w-full rounded bg-black text-white p-2 mt-2">
            Verify OTP
          </button>
        </>
      )}
    </div>
  )
}

function getCookie(name: string) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return m ? m.pop() : ''
}


