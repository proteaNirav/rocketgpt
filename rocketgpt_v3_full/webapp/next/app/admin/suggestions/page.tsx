'use client'
import { useState } from 'react'

export default function AdminSuggestions() {
  const [issue, setIssue] = useState('')
  const [token, setToken] = useState('')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  async function call(path: string, body?: any) {
    setMsg(null)
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    setMsg(data.ok ? 'Done.' : `Error: ${data.error}`)
  }

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl mb-4 font-semibold">Admin: Suggestions</h2>
      <input
        className="w-full mb-2 p-2 rounded bg-black/20 border"
        placeholder="Issue number"
        value={issue}
        onChange={(e) => setIssue(e.target.value)}
      />
      <input
        className="w-full mb-2 p-2 rounded bg-black/20 border"
        placeholder="Admin token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
      />
      <div className="flex gap-2 mb-2">
        <button
          className="px-3 py-2 rounded bg-emerald-600/60 border"
          onClick={() => call(`/api/suggestions/${issue}/approve`)}
        >
          Approve & Trigger
        </button>
        <button
          className="px-3 py-2 rounded bg-rose-600/60 border"
          onClick={() => call(`/api/suggestions/${issue}/reject`, { reason })}
        >
          Reject
        </button>
      </div>
      <input
        className="w-full mb-2 p-2 rounded bg-black/20 border"
        placeholder="Reject reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      {msg && <div className="opacity-80">{msg}</div>}
    </div>
  )
}
