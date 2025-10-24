'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PromptRow = {
  id: string
  goal: string
  created_at: string
  decision_summary?: string | null
  email?: string | null
}

export function HistoryList({ onRerun }: { onRerun: (goal: string) => void }) {
  const [rows, setRows] = useState<PromptRow[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  async function load() {
    setLoading(true)

    // If you want per-user history when signed in, get the email:
    const { data: u } = await supabase.auth.getUser()
    const email = u?.user?.email ?? null
    setUserEmail(email)

    let q = supabase.from('user_prompts').select('*')
    if (email) q = q.eq('email', email)           // filter by user when logged in
    q = q.order('created_at', { ascending: false }).limit(50)

    const { data, error } = await q
    if (!error && data) setRows(data as PromptRow[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // realtime refresh on INSERT
    const channel = supabase
      .channel('user_prompts_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_prompts' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Recent Prompts {userEmail ? `(you)` : ''}</div>

      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted">No prompts yet.</div>
      ) : (
        <ul className="text-sm max-h-[300px] overflow-y-auto space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate">• {r.goal}</div>
                <div className="text-xs text-muted">
                  {new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
              <button className="btn px-3 py-1 text-xs shrink-0" onClick={() => onRerun(r.goal)}>
                Re-run
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
