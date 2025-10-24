'use client'
import { useState } from 'react'
import { getSupabase } from '@/lib/supabase'

export default function AuthModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  if (!open) return null

  async function signIn(e?: React.FormEvent) {
    e?.preventDefault()
    const sb = getSupabase()
    if (!sb) {
      setMsg('Auth temporarily unavailable — missing Supabase config.')
      return
    }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    })
    setMsg(error ? error.message : 'Magic link sent — check your inbox.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card p-6 w-[min(420px,92vw)] space-y-3">
        <div className="font-semibold text-lg">Sign in to RocketGPT</div>
        <form onSubmit={signIn} className="space-y-2">
          <input
            className="input w-full"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn w-full" type="submit">
            Send Magic Link
          </button>
        </form>
        {msg && <div className="text-sm text-muted">{msg}</div>}
        <button className="text-xs text-muted" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
