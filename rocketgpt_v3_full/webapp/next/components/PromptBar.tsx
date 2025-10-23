'use client'
import { useState } from 'react'

export default function PromptBar({ onSend, loading }: any) {
  const [text, setText] = useState('')
  async function submit(e: any) {
    e.preventDefault()
    if (!text.trim()) return
    await onSend(text.trim())
    setText('')
  }
  return (
    <form onSubmit={submit} className="card p-3 flex items-center gap-2">
      <textarea
        className="input min-h-[54px]"
        placeholder="Describe what you want. I’ll build the cheapest + fastest path…"
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />
      <button className="btn shrink-0" disabled={loading} type="submit">{loading ? '…' : 'Run'}</button>
    </form>
  )
}
