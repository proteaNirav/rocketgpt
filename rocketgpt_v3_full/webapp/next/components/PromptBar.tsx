'use client'
import { useState } from 'react'
import Spinner from './Spinner'

export default function PromptBar({ onSend, loading }: any) {
  const [text, setText] = useState('')
  async function submit(e: any) {
    e.preventDefault()
    if (!text.trim() || loading) return
    await onSend(text.trim())
    setText('')
  }
  return (
    <form onSubmit={submit} className="card p-3 flex items-center gap-3">
      <textarea
        className="input min-h-[56px]"
        placeholder="Describe what you want. I’ll build the cheapest + fastest path…"
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />
      <button
        className="btn shrink-0 flex items-center gap-2 bg-panel hover:bg-[#0f1420]"
        disabled={loading}
        type="submit"
        aria-label="Run"
        title="Run"
      >
        {loading ? <Spinner/> : <span className="inline-block rounded-full border border-border p-2">🟢</span>}
        {loading ? 'Running' : 'Run'}
      </button>
    </form>
  )
}
