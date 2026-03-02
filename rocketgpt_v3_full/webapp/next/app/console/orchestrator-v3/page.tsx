'use client'

import React, { useCallback, useState } from 'react'

type Phase = 'planner' | 'builder' | 'tester' | 'finalize' | 'noop' | 'unknown'
type DerivedStatus = 'pending' | 'planner' | 'builder' | 'tester' | 'completed' | 'unknown'

type AutoAdvanceResponse = {
  success: boolean
  runId?: number
  phase?: Phase
  phaseResult?: any
  message?: string
}

type StartRunResponse = {
  success: boolean
  runId?: number
  message?: string
}

type StatusResponse = {
  success: boolean
  runId?: number
  status?: string | null
  derivedStatus?: DerivedStatus
  run?: any
  message?: string
}

const TIMELINE_ORDER: DerivedStatus[] = ['pending', 'planner', 'builder', 'tester', 'completed']

function getTimelineIndex(status: DerivedStatus | undefined): number {
  if (!status || status === 'unknown') return 0
  const idx = TIMELINE_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

export default function OrchestratorV3ConsolePage() {
  const [goalTitle, setGoalTitle] = useState<string>('Test Run via Orchestrator V3')
  const [goalDescription, setGoalDescription] = useState<string>(
    'Testing Planner → Builder → Tester via auto-advance.',
  )

  const [currentRunId, setCurrentRunId] = useState<number | null>(null)

  const [lastPhase, setLastPhase] = useState<Phase>('unknown')
  const [lastPhaseResult, setLastPhaseResult] = useState<string>('null')

  const [rawStatus, setRawStatus] = useState<string | null>(null)
  const [derivedStatus, setDerivedStatus] = useState<DerivedStatus>('unknown')

  const [runSummary, setRunSummary] = useState<string>('')
  const [logLines, setLogLines] = useState<string[]>([])
  const [isBusy, setIsBusy] = useState<boolean>(false)

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [line, ...prev].slice(0, 100))
  }, [])

  // --- API helpers --------------------------------------------------------

  async function callStartRun(): Promise<StartRunResponse> {
    const res = await fetch('/api/orchestrator/start-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal_title: goalTitle,
        goal_description: goalDescription,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`start-run HTTP ${res.status}: ${text}`)
    }
    return res.json()
  }

  async function callAutoAdvance(runId: number): Promise<AutoAdvanceResponse> {
    const res = await fetch('/api/orchestrator/auto-advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`auto-advance HTTP ${res.status}: ${text}`)
    }
    return res.json()
  }

  async function callStatus(runId: number): Promise<StatusResponse> {
    const res = await fetch(`/api/orchestrator/run/status?runId=${runId}`)
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`status HTTP ${res.status}: ${text}`)
    }
    return res.json()
  }

  // --- Actions ------------------------------------------------------------

  const handleStartRun = async () => {
    try {
      setIsBusy(true)
      setLastPhase('unknown')
      setLastPhaseResult('null')
      setRawStatus(null)
      setDerivedStatus('unknown')
      setRunSummary('')

      const result = await callStartRun()

      if (!result.success || !result.runId) {
        appendLog(`[ERROR] start-run failed: ${result.message ?? 'Unknown error'}`)
        return
      }

      setCurrentRunId(result.runId)
      appendLog(`Run ${result.runId} started (status: pending).`)

      // Initial status fetch
      try {
        const status = await callStatus(result.runId)
        if (status.success) {
          setRawStatus(status.status ?? null)
          setDerivedStatus(status.derivedStatus ?? 'unknown')
          const goal = status.run?.goal_title ?? goalTitle
          const desc = status.run?.goal_description ?? goalDescription
          setRunSummary(`${goal} — ${desc}`)
        }
      } catch (err) {
        appendLog(`[WARN] Could not fetch initial status: ${(err as Error).message}`)
      }
    } catch (err) {
      appendLog(`[ERROR] start-run exception: ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleAutoAdvanceOnce = async () => {
    if (!currentRunId) {
      appendLog('[WARN] No runId. Start a run first.')
      return
    }

    try {
      setIsBusy(true)
      const resp = await callAutoAdvance(currentRunId)

      const phase = (resp.phase ?? 'unknown') as Phase
      setLastPhase(phase)
      setLastPhaseResult(JSON.stringify(resp.phaseResult ?? null, null, 2))

      if (!resp.success) {
        appendLog(
          `[ERROR] auto-advance failed for run ${currentRunId}: ${resp.message ?? 'Unknown error'}`,
        )
      } else {
        appendLog(`Run ${currentRunId} → phase=${phase}`)
      }

      // Refresh status
      try {
        const status = await callStatus(currentRunId)
        if (status.success) {
          setRawStatus(status.status ?? null)
          setDerivedStatus(status.derivedStatus ?? 'unknown')
          const goal = status.run?.goal_title ?? goalTitle
          const desc = status.run?.goal_description ?? goalDescription
          setRunSummary(`${goal} — ${desc}`)
        } else {
          appendLog(
            `[WARN] status call failed for run ${currentRunId}: ${status.message ?? 'Unknown'}`,
          )
        }
      } catch (err) {
        appendLog(`[WARN] Could not refresh status: ${(err as Error).message}`)
      }
    } catch (err) {
      appendLog(`[ERROR] auto-advance exception for run ${currentRunId}: ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleAutoAdvanceUntilDone = async () => {
    if (!currentRunId) {
      appendLog('[WARN] No runId. Start a run first.')
      return
    }

    setIsBusy(true)
    appendLog(`Starting auto-advance loop for run ${currentRunId} ...`)

    try {
      let safetyCounter = 0
      let lastPhaseLocal: Phase = 'unknown'

      while (safetyCounter < 30) {
        safetyCounter++

        const resp = await callAutoAdvance(currentRunId)
        const phase = (resp.phase ?? 'unknown') as Phase

        lastPhaseLocal = phase
        setLastPhase(phase)
        setLastPhaseResult(JSON.stringify(resp.phaseResult ?? null, null, 2))

        if (!resp.success) {
          appendLog(
            `[ERROR LOOP] auto-advance failed (phase=${phase}): ${resp.message ?? 'Unknown error'}`,
          )
          break
        } else {
          appendLog(`Run ${currentRunId} → phase=${phase} (loop)`)
        }

        // Refresh status
        try {
          const status = await callStatus(currentRunId)
          if (status.success) {
            setRawStatus(status.status ?? null)
            setDerivedStatus(status.derivedStatus ?? 'unknown')
            const goal = status.run?.goal_title ?? goalTitle
            const desc = status.run?.goal_description ?? goalDescription
            setRunSummary(`${goal} — ${desc}`)
          }
        } catch (err) {
          appendLog(`[WARN] Could not refresh status during loop: ${(err as Error).message}`)
        }

        if (phase === 'noop' || phase === 'finalize') {
          appendLog('Auto-advance loop reached terminal phase; stopping.')
          break
        }
      }

      if (safetyCounter >= 30) {
        appendLog(
          `[WARN] Auto-advance loop stopped due to safety counter (phase=${lastPhaseLocal}).`,
        )
      }
    } catch (err) {
      appendLog(`[ERROR LOOP] auto-advance loop exception: ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const currentTimelineIndex = getTimelineIndex(derivedStatus)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="border-b border-slate-800 pb-4 mb-4">
          <h1 className="text-2xl font-semibold">
            Orchestrator V3 Console (Planner → Builder → Tester)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Multi-phase async orchestrator using{' '}
            <code className="px-1 py-0.5 bg-slate-900 rounded text-xs">
              /api/orchestrator/start-run
            </code>{' '}
            and{' '}
            <code className="px-1 py-0.5 bg-slate-900 rounded text-xs">
              /api/orchestrator/auto-advance
            </code>
            .
          </p>
        </header>

        {/* 1. Define Goal & Start Run */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold flex items-center justify-between">
            <span>1. Define Goal &amp; Start Run</span>
            {currentRunId && (
              <span className="text-xs font-normal text-slate-400">
                Current run ID: <span className="font-mono text-sky-400">{currentRunId}</span>
              </span>
            )}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">Goal Title</label>
              <input
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-sky-500/40"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Goal Description
              </label>
              <textarea
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm min-h-[40px] focus:outline-none focus:ring focus:ring-sky-500/40"
                value={goalDescription}
                onChange={(e) => setGoalDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleStartRun}
              disabled={isBusy}
              className={classNames(
                'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600',
              )}
            >
              Start Run
            </button>
            {runSummary && (
              <p className="text-xs text-slate-400 truncate">
                <span className="font-semibold text-slate-300">Run Summary:</span> {runSummary}
              </p>
            )}
          </div>
        </section>

        {/* 2. Auto-Advance Pipeline */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold">2. Auto-Advance Pipeline</h2>
          <p className="text-xs text-slate-400">
            Each click calls{' '}
            <code className="px-1 py-0.5 bg-slate-900 rounded text-xs">
              /api/orchestrator/auto-advance
            </code>{' '}
            once. It moves the run through{' '}
            <span className="font-mono">Planner → Builder → Tester → Finalize</span>. You can also
            run the full loop automatically.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoAdvanceOnce}
              disabled={isBusy || !currentRunId}
              className={classNames(
                'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600',
              )}
            >
              Auto-Advance Once
            </button>
            <button
              onClick={handleAutoAdvanceUntilDone}
              disabled={isBusy || !currentRunId}
              className={classNames(
                'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium',
                'bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600',
              )}
            >
              Auto-Advance Until Done
            </button>
            {isBusy && (
              <span className="text-xs text-sky-400">Working… check logs and timeline below.</span>
            )}
          </div>

          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Last phase:</span>{' '}
              <span className="font-mono text-sky-400">{lastPhase}</span>
            </p>
            <p className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Raw status:</span>{' '}
              <span className="font-mono text-amber-400">{rawStatus ?? 'null'}</span>{' '}
              <span className="ml-3 font-semibold text-slate-200">Derived status:</span>{' '}
              <span className="font-mono text-emerald-400">{derivedStatus}</span>
            </p>
          </div>

          <div className="mt-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">
              Last phase result (JSON)
            </label>
            <pre className="mt-1 max-h-48 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200">
              {lastPhaseResult}
            </pre>
          </div>
        </section>

        {/* 3. Run Status & Log */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold">3. Run Status &amp; Log</h2>
          <p className="text-sm">
            Status: <span className="font-mono text-emerald-400">{derivedStatus ?? 'unknown'}</span>
          </p>
          <div className="mt-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">Recent events</label>
            <div className="mt-1 max-h-48 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-xs space-y-1">
              {logLines.length === 0 && <p className="text-slate-500">No events yet.</p>}
              {logLines.map((line, idx) => (
                <div key={idx} className="font-mono">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Run Status Timeline */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
          <h2 className="text-lg font-semibold">4. Run Status Timeline</h2>
          <p className="text-sm">
            Current Status:{' '}
            <span className="font-mono text-emerald-400">{derivedStatus ?? 'unknown'}</span>
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {TIMELINE_ORDER.map((stage, index) => {
              const currentIdx = currentTimelineIndex
              const isCurrent = currentIdx === index
              const isCompleted = currentIdx > index

              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className="w-4 text-center">
                    {isCurrent ? '👉' : isCompleted ? '✓' : '•'}
                  </span>
                  <span
                    className={classNames(
                      'px-2 py-0.5 rounded-full border text-xs font-mono',
                      isCurrent && 'border-emerald-400 text-emerald-300',
                      isCompleted && 'border-slate-600 text-slate-300 line-through',
                      !isCurrent && !isCompleted && 'border-slate-700 text-slate-400',
                    )}
                  >
                    {stage}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
