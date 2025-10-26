'use client'

import { ManualReviewButton } from "@/components/ManualReviewButton";
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { fetchProposals, isSuperuser, Proposal, updateProposal } from '@/lib/proposals'

type ProposalWithJob = Proposal & {
  last_self_apply_job_id: string | null;
};

function Badge({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray'|'green'|'red'|'blue'|'amber' }) {
  const tones: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-800',
  }
  return <span className={`inline-block text-xs px-2 py-0.5 rounded ${tones[tone]}`}>{children}</span>
}

function Row({ p, onChange }: {
  p: Proposal
  onChange: (id: string, updates: Partial<Proposal>) => Promise<void>
}) {
  const [branch, setBranch] = useState(p.branch_name ?? '')
  const [pr, setPr] = useState(p.pr_url ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')

  async function setStatus(status: Proposal['status']) {
    try {
      setBusy(true); setError('')
      await onChange(p.id, { status })
    } catch (e: any) {
      setError(e.message || 'update failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveLinks() {
    try {
      setBusy(true); setError('')
      await onChange(p.id, { branch_name: branch || null, pr_url: pr || null })
    } catch (e: any) {
      setError(e.message || 'update failed')
    } finally {
      setBusy(false)
    }
  }

  const tone = p.severity === 'high' ? 'red' : p.severity === 'medium' ? 'amber' : 'gray'
  const statusTone = p.status === 'approved' ? 'green'
    : p.status === 'under_review' ? 'blue'
    : p.status === 'implemented' ? 'green'
    : p.status === 'rejected' ? 'red'
    : 'gray'

  return (
    <div className="border rounded p-4 space-y-2 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{p.title}</div>
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{p.severity}</Badge>
          <Badge tone="gray">conf {p.confidence?.toFixed(2)}</Badge>
          <Badge tone={statusTone}>{p.status}</Badge>
        </div>
      </div>
      <div className="text-sm text-gray-700"><b>Area:</b> {p.impacted_area}</div>
      <div className="text-sm text-gray-700"><b>Hypothesis:</b> {p.hypothesis}</div>
      {p.rationale && (
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
          {JSON.stringify(p.rationale, null, 2)}
        </pre>
      )}

      <div className="grid md:grid-cols-2 gap-2 pt-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Branch name</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="feature/improve-latency"
            value={branch}
            onChange={e=>setBranch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500">PR URL</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="https://github.com/owner/repo/pull/123"
            value={pr}
            onChange={e=>setPr(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <button
            className="border rounded px-3 py-1 text-sm mr-2"
            onClick={saveLinks}
            disabled={busy}
          >
            Save links
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button className="border rounded px-3 py-1 text-sm" onClick={()=>setStatus('under_review')} disabled={busy}>Mark Under Review</button>
        <button className="border rounded px-3 py-1 text-sm" onClick={()=>setStatus('approved')} disabled={busy}>Approve</button>
        <button className="border rounded px-3 py-1 text-sm" onClick={()=>setStatus('rejected')} disabled={busy}>Reject</button>
        <button className="border rounded px-3 py-1 text-sm" onClick={()=>setStatus('implemented')} disabled={busy}>Implemented</button>
        <button className="border rounded px-3 py-1 text-sm" onClick={()=>setStatus('queued')} disabled={busy}>Back to Queue</button>
        <ManualReviewButton jobId={p.last_self_apply_job_id} />
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="text-xs text-gray-400">Created: {new Date(p.created_at).toLocaleString()}</div>
    </div>
  )
}

export default function SuperProposalsPage() {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [rows, setRows] = useState<Proposal[]>([])
  const [q, setQ] = useState('') // quick client-side filter
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      const ok = await isSuperuser()
      setAllowed(ok)
      if (ok) {
        try {
          const list = await fetchProposals()
          setRows(list)
        } catch (e: any) {
          setErr(e.message || 'load failed')
        }
      }
      setLoading(false)
    })()
  }, [])

  async function refresh() {
    setErr('')
    try {
      const list = await fetchProposals()
      setRows(list)
    } catch (e: any) {
      setErr(e.message || 'load failed')
    }
  }

  async function onChange(id: string, updates: Partial<Proposal>) {
    await updateProposal(id, updates)
    // optimistic: update local state
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const filtered = useMemo(() => {
    if (!q) return rows
    const needle = q.toLowerCase()
    return rows.filter(r =>
      r.title.toLowerCase().includes(needle) ||
      r.impacted_area.toLowerCase().includes(needle) ||
      r.status.toLowerCase().includes(needle) ||
      r.severity.toLowerCase().includes(needle)
    )
  }, [rows, q])

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Loading…</div>
  }
  if (!allowed) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-2">
        <h1 className="text-xl font-semibold">Superuser Only</h1>
        <p className="text-sm text-gray-600">You don’t have access to this page.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Improvement Proposals</h1>
        <div className="flex gap-2">
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Filter: status/area/severity/text…"
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
          <button className="border rounded px-3 py-1 text-sm" onClick={refresh}>Refresh</button>
        </div>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="grid gap-3">
        {filtered.map(p => (
          <Row key={p.id} p={p} onChange={onChange} />
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500 border rounded p-4">
            No proposals yet. Generate some observations (slow/fail/UI error) and run the nightly evaluator.
          </div>
        )}
      </div>
    </div>
  )
}
