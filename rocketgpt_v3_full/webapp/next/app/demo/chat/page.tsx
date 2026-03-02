'use client'

import React, { useState, FormEvent } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export default function DemoChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      const reply = data.reply ?? data.message ?? 'Demo reply with no explicit text.'
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: String(reply),
      }
      setMessages([...newMessages, assistantMessage])
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-start p-4 gap-4">
      <div className="w-full max-w-3xl border rounded-xl p-4 shadow-sm bg-white/80 dark:bg-neutral-900/80">
        <h1 className="text-2xl font-semibold mb-2">RocketGPT Demo Chat & Orchestrator</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This page demonstrates end-to-end chat wiring via
          <code className="ml-1 px-1 rounded bg-gray-100 dark:bg-neutral-800">/api/demo/chat</code>.
          The backend currently uses a demo orchestrator stub, which you can later point to the real
          RocketGPT orchestrator.
        </p>

        <div className="border rounded-lg p-3 h-72 overflow-y-auto bg-gray-50 dark:bg-neutral-900">
          {messages.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No messages yet. Say hello to RocketGPT demo…
            </div>
          )}
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`mb-2 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 dark:bg-neutral-800 dark:text-gray-50'
                }`}
              >
                <div className="text-[11px] opacity-70 mb-0.5">
                  {m.role === 'user' ? 'You' : 'RocketGPT Demo'}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <textarea
            className="flex-1 border rounded-lg px-3 py-2 text-sm min-h-[44px] max-h-[96px] resize-y bg-white dark:bg-neutral-900"
            placeholder="Type a message to RocketGPT demo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium border bg-blue-600 text-white disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>

        {error && (
          <div className="mt-2 text-xs text-red-500">Error talking to /api/demo/chat: {error}</div>
        )}
      </div>
    </div>
  )
}
