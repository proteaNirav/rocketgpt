'use client'
import { useState } from 'react'
import Spinner from './Spinner'
import { useChat } from '@/lib/store'

export default function PromptBar({ onSend, loading }: any) {
  const [text, setText] = useState('')
  const { controller } = useChat()

  async function submit(e: any) {
    e.preventDefault()
    if (!text.trim() || loading) return
    await onSend(text.trim())
    setText('')
  }

  function onStop() {
    try { controller?.abort() } catch {}
  }

  return (
    <form onSubmit={submit} className="card p-3 flex items-center gap-3">
      <textarea
        className="input min-h-[56px]"
        placeholder="Describe what you want. Iâ€™ll build the cheapest + fastest pathâ€¦"
        value={text}
        onChange={(e)=>setText(e.target.value)}
      />
      {!loading ? (
        <button className="btn shrink-0 flex items-center gap-2" type="submit" aria-label="Run" title="Run">
          <span className="inline-block rounded-full border border-border p-2">ðŸŸ¢</span>
          Run
        </button>
      ) : (
        <button type="button" className="btn shrink-0 flex items-center gap-2 border-error/50" onClick={onStop}>
          <Spinner/> Stop
        </button>
      )}
    </form>
  )
}


