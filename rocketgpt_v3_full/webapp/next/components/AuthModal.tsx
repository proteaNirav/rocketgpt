'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')

  if (!open) return null

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({ email })
    setMsg(error ? error.message : 'Check your inbox for the login link.')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="card p-6 w-[min(400px,90vw)] space-y-3">
        <div className="font-semibold text-lg">Sign in to RocketGPT</div>
        <input
          className="input w-full"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn w-full" onClick={signIn}>Send Magic Link</button>
        {msg && <div className="text-sm text-muted">{msg}</div>}
        <button className="text-xs text-muted" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
