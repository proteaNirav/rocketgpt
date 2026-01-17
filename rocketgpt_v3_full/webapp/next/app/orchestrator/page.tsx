'use client'

import React, { useState } from 'react'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

type AnyRecord = Record<string, any>

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === true) {
    return (
      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
        <CheckCircle size={16} /> PASS
      </span>
    )
  }
  if (ok === false) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-sm">
        <XCircle size={16} /> FAIL
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
      <AlertTriangle size={16} /> UNKNOWN
    </span>
  )
}

export default function OrchestratorPage() {
  const [goal, setGoal] = useState('Add Dark Mode to Settings UI')
  const [triggerSource, setTriggerSource] = useState('manual-ui')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<AnyRecord | null>(null)

  async function runOrchestrator() {
    setLoading(true)
    setError(null)
    setResp(null)

    try {
      const res = await fetch('/api/orchestrator/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim().length > 0 ? goal.trim() : undefined,
          triggerSource: triggerSource || 'manual-ui',
        }),
      })

      const data = await res.json()
      setResp(data)
    } catch (err: any) {
      setError(err?.message || 'Unexpected error while calling orchestrator.')
    } finally {
      setLoading(false)
    }
  }

  const orchOk =
    resp?.success === true || resp?.tester?.success === true || resp?.builder?.success === true

  return (
    <div className="p-6 space-y-8">
      {/* Orchestrator Runner */}
      <div className="rounded-xl border border-gray-800 p-6 bg-black/30 space-y-4">
        <h1 className="text-2xl font-semibold">Neural Orchestrator (stub)</h1>
        <p className="text-sm text-gray-400">
          This console calls <code>/api/orchestrator/run</code> and shows the stubbed Planner →
          Builder → Tester pipeline. Later this will be wired to the real agents and database.
        </p>

        {error && (
          <div className="border border-red-600 text-red-400 p-3 rounded-md text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">Goal</label>
            <textarea
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              rows={4}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">Trigger Source</label>
            <input
              className="w-full rounded-md border border-gray-700 bg-black/40 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={triggerSource}
              onChange={(e) => setTriggerSource(e.target.value)}
              placeholder="manual-ui"
            />

            <div className="mt-4">
              <button
                onClick={runOrchestrator}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg text-white inline-flex items-center gap-2 text-sm"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Run Orchestrator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orchestrator Result */}
      {resp && (
        <div className="rounded-xl border border-gray-800 p-6 bg-black/20 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Run Summary</h2>
            <StatusBadge ok={orchOk ? true : null} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Overview */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700 space-y-2">
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Run ID:</span> {resp.run_id || '-'}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Created:</span> {resp.created_at || '-'}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Trigger:</span> {resp.triggerSource || '-'}
              </p>
              <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">
                {resp.message || '(no message)'}
              </p>
            </div>

            {/* Goal */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700">
              <p className="text-xs font-semibold text-gray-300 mb-1">Goal</p>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{resp.goal || '-'}</p>
            </div>

            {/* Planner / Builder / Tester quick status */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-300">Agents</p>
              <p className="text-sm text-gray-300 flex items-center justify-between">
                <span>Planner</span>
                <StatusBadge
                  ok={resp.planner?.success === true ? true : resp.planner ? null : null}
                />
              </p>
              <p className="text-sm text-gray-300 flex items-center justify-between">
                <span>Builder</span>
                <StatusBadge
                  ok={resp.builder?.success === true ? true : resp.builder ? null : null}
                />
              </p>
              <p className="text-sm text-gray-300 flex items-center justify-between">
                <span>Tester</span>
                <StatusBadge
                  ok={resp.tester?.success === true ? true : resp.tester ? null : null}
                />
              </p>
            </div>
          </div>

          {/* Raw JSON */}
          <details className="border border-gray-800 rounded-lg bg-black/20">
            <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-black/30">
              Full Orchestrator Response (raw JSON)
            </summary>
            <pre className="p-4 text-xs whitespace-pre-wrap overflow-x-auto text-gray-300 bg-black/30 border-t border-gray-800">
              {JSON.stringify(resp, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
