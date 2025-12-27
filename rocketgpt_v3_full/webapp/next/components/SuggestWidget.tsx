'use client'
import { useState } from 'react'

export default function SuggestWidget() {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [email, setEmail] = useState('')
  const [engine, setEngine] = useState('anthropic')
  const [msg, setMsg] = useState<string | null>(null)

  async function submit() {
    setMsg(null)
    const res = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: desc,
        contactEmail: email,
        url: typeof window !== 'undefined' ? window.location.href : '',
        engine,
      }),
    })
    const data = await res.json()
    if (data.ok) setMsg(`Submitted. Issue #${data.issue_number}`)
    else setMsg(`Error: ${data.error}`)
  }

  return (
    <div className="rounded-xl p-4 border mt-4 max-w-xl bg-black/30">
      <h3 className="font-semibold mb-2">Suggest a Feature</h3>
      <input
        className="w-full mb-2 p-2 rounded bg-black/20 border"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full mb-2 p-2 rounded bg-black/20 border"
        rows={4}
        placeholder="Describe the feature"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 p-2 rounded bg-black/20 border"
          placeholder="Contact email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="p-2 rounded bg-black/20 border"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
        >
          <option value="anthropic">anthropic</option>
          <option value="openai">openai</option>
          <option value="google">google</option>
          <option value="groq">groq</option>
        </select>
      </div>
      <button onClick={submit} className="px-3 py-2 rounded bg-white/10 border hover:bg-white/20">
        Submit
      </button>
      {msg && <div className="mt-2 text-sm opacity-80">{msg}</div>}
    </div>
  )
}
