'use client'

import { useState } from 'react'
import { useChat } from '@/lib/store'
import { estimate as apiEstimate } from '@/lib/api'

function s(v: unknown): string {
  // Safe stringifier to avoid TS2345 when values can be undefined/null
  if (v === undefined || v === null) return ''
  return typeof v === 'string' ? v : JSON.stringify(v)
}

export default function ToolRunner() {
  const { runnerOpen, selectedTool, closeRunner } = useChat()

  // Keep these strictly strings
  const [status, setStatus] = useState<string>('')
  const [output, setOutput] = useState<string>('')

  if (!runnerOpen || !selectedTool) return null

  async function onRun() {
    try {
      setStatus('Running…')
      setOutput('')

      // Build a minimal estimate request from current selection
      const resp = await apiEstimate({
        path: {
          toolId: selectedTool.toolId,
          steps: selectedTool.plan || [],
          template: undefined,
          inputs: { goal: selectedTool.goal },
        },
      })

      // Coalesce possibly-undefined fields to strings
      setStatus('Done')
      setOutput(
        s({
          estimates: resp?.estimates,
          breakdown: resp?.breakdown,
        })
      )
    } catch (err: any) {
      setStatus('Error')
      setOutput(s(err?.message || 'Failed to run tool'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="card w-[min(720px,94vw)] p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-lg">
              Run: {selectedTool.toolId}
            </div>
            <div className="text-sm text-muted truncate">
              Goal: {selectedTool.goal}
            </div>
          </div>
          <button className="btn" onClick={closeRunner}>Close</button>
        </div>

        <div className="bg-panel rounded-md p-3 text-sm">
          <div className="font-medium mb-1">Plan steps</div>
          <ol className="list-decimal ml-5 space-y-1">
            {(selectedTool.plan || []).map((st) => (
              <li key={st.id}>
                <span className="font-medium">{st.title}</span>
                {st.detail ? <span className="text-muted"> — {st.detail}</span> : null}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-2">
          <button className="btn" onClick={onRun}>Run</button>
          <span className="text-sm text-muted self-center">{status}</span>
        </div>

        <div className="bg-panel rounded-md p-3 text-sm whitespace-pre-wrap break-words min-h-[80px]">
          {output || 'No output yet.'}
        </div>
      </div>
    </div>
  )
}
