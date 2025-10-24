'use client'
import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import ProgressBar from './ProgressBar'
import { useChat } from '@/lib/store'
import { TOOL_CATALOG, buildToolUrl } from '@/lib/tools'

export default function ToolRunner() {
  const { runnerOpen, selectedTool, closeRunner } = useChat()
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Ready')
  const meta = useMemo(() => selectedTool ? TOOL_CATALOG[selectedTool.toolId] : null, [selectedTool])

  useEffect(() => {
    if (!runnerOpen || !selectedTool || !meta) return
    setProgress(0)
    setStatus('Starting…')

    if (meta.runMode === 'redirect') {
      const url = buildToolUrl(selectedTool.toolId, {
        goal: selectedTool.goal,
        plan: selectedTool.plan,
      })
      setStatus('Opening tool in a new tab…')
      const t = setTimeout(() => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
        setProgress(100)
        setStatus('Opened')
      }, 800)
      return () => clearTimeout(t)
    }

    if (meta.runMode === 'simulate') {
      const steps = meta.steps || ['Preparing…', 'Working…', 'Finishing…']
      let i = 0
      setStatus(steps[0])
      const interval = setInterval(() => {
        i += 1
        const pct = Math.round((i / (steps.length + 1)) * 100)
        setProgress(Math.min(95, pct))
        if (i < steps.length) {
          setStatus(steps[i])
        } else {
          clearInterval(interval)
          setProgress(100)
          setStatus('Done')
        }
      }, 900)
      return () => clearInterval(interval)
    }
  }, [runnerOpen, selectedTool, meta])

  return (
    <Modal open={runnerOpen} onClose={closeRunner} title={meta ? `Running: ${meta.title}` : 'Runner'}>
      {!selectedTool || !meta ? (
        <div className="text-muted">No tool selected.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm opacity-80">Goal: <span className="opacity-100">{selectedTool.goal}</span></div>
          <ProgressBar value={progress} />
          <div className="text-sm">{status}</div>
          {meta.runMode === 'simulate' && meta.steps && (
            <ul className="text-sm list-disc pl-5 space-y-1 opacity-80">
              {meta.steps.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}
