'use client'

export function HomeV2CenterPane() {
  const mockMessages = [
    { role: 'user', text: 'Hello RocketGPT, help me plan next steps.' },
    { role: 'assistant', text: 'Of course. What would you like to focus on today?' },
  ]

  return (
    <div className="flex-1 p-4 flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Chat Workspace</h1>
        <p className="text-sm text-muted-foreground">A Claude-style conversational interface.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto border rounded-lg p-4 bg-card">
        {mockMessages.map((m, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              m.role === 'assistant' ? 'bg-muted' : 'bg-primary/10 text-primary-foreground'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="flex-1 border rounded-lg bg-background p-3 text-sm"
          placeholder="Type your message..."
        />
        <button className="px-4 py-2 rounded bg-primary text-primary-foreground">Send</button>
      </div>
    </div>
  )
}
