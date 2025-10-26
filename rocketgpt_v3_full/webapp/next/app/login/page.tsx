'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string>('')

  async function signIn() {
    setMsg('Signing in...')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('Signed in as ' + (data.user?.email ?? 'user'))
  }

  async function signOut() {
    await supabase.auth.signOut()
    setMsg('Signed out')
  }

  return (
    <div className="max-w-sm mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Login</h1>
      <input
        className="w-full border rounded p-2"
        placeholder="email"
        type="email"
        value={email}
        onChange={e=>setEmail(e.target.value)}
      />
      <input
        className="w-full border rounded p-2"
        placeholder="password"
        type="password"
        value={password}
        onChange={e=>setPassword(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="border rounded px-3 py-1" onClick={signIn}>Sign in</button>
        <button className="border rounded px-3 py-1" onClick={signOut}>Sign out</button>
      </div>
      <div className="text-sm text-gray-600">{msg}</div>
    </div>
  )
}
