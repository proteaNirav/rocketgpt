'use client'

import { useEffect, useState } from 'react'
import { useChat } from '@/lib/store'

export default function ToolRunner() {
  const { runnerOpen, selectedTool, closeRunner } = useChat()
  const [status, setStatus] = useState<string>('idle')
  const [output, setOutput] = useState<string>('')

  // Reset when modal opens/closes or tool changes
  useEffect(() => {
    if (!runnerOpen) {
      setStatus('idle')
      setOutput('')
    } else {
      setStatus('ready')
      setOutput('')
    }
  }, [runnerOpen, selectedTool])

  // Runtime guard: if closed or no tool, render nothing
  if (!runnerOpen || !selectedTool) return null

  // TS narrowing: from here on, `tool` is definitely non-null
  const tool = selectedTool as NonNullable<typeof selectedTool>

  async function handleRun() {
    setStatus('running')
    setOutput('')

    try {
      // Simulate real execution; replace with your API call if needed
      await new Promise((r) => setTimeout(r, 600))

      const msg =
        `Executed tool "${tool.toolId}" for goal ` +
        `"${tool.goal}". Steps: ${tool.plan?.length ?? 0}.`

      setStatus('done')
      setOutput(msg)
    } catch (e: any) {
      setStatus('failed')
      setOutput(e?.message ?? 'Unknown error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card p-5 w-[min(640px,94vw)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Run: {tool.toolId}</div>
          <button className="text-sm text-muted" onClick={closeRunner}>Close</button>
        </div>

        <div className="text-sm">
          <div className="mb-1">
            <span className="font-medium">Goal:</span> {tool.goal}
          </div>
          <div>
            <span className="font-medium">Steps:</span> {tool.plan?.length ?? 0}
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={handleRun} disabled={status === 'running'}>
            {status === 'running' ? 'Running…' : 'Run'}
          </button>
          <button className="btn btn-ghost" onClick={closeRunner}>
            Cancel
          </button>
        </div>

        <div className="mt-2 text-xs text-muted">
          Status: <span className="font-mono">{status || 'idle'}</span>
        </div>

        {!!output && (
          <pre className="bg-panel border border-border rounded-md p-3 text-xs whitespace-pre-wrap">
            {output}
          </pre>
        )}
      </div>
    </div>
  )
}
