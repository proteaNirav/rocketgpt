'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { logObservation } from '@/lib/obs'

export default function DebugAuthPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      setEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUserId(session?.user?.id ?? null)
      setEmail(session?.user?.email ?? null)
    })
    return () => { sub?.subscription.unsubscribe() }
  }, [])

  async function writeTestObservation() {
    setMsg('Writing...')
    await logObservation({
      source: 'ui',
      event_type: 'debug.test',
      success: true,
      detail: { note: 'manual test from /debug-auth' }
    })
    setMsg('Observation inserted (check /observations).')
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth & Observation Debug</h1>
      <div className="text-sm">
        <div><b>User ID:</b> {userId ?? 'not signed in'}</div>
        <div><b>Email:</b> {email ?? '-'}</div>
      </div>
      <button className="border rounded px-3 py-1" onClick={writeTestObservation}>
        Write test observation
      </button>
      <div className="text-sm text-gray-600">{msg}</div>
      <p className="text-xs text-gray-500 mt-2">
        Superusers will see all rows in /observations. Regular users only see their own.
      </p>
    </div>
  )
}
