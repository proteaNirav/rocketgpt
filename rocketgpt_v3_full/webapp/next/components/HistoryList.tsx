'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type PromptRow = {
  id: string
  goal: string
  created_at: string
  decision_summary?: string | null
}

export function HistoryList() {
  const [rows, setRows] = useState<PromptRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (!error && data) setRows(data)
      setLoading(false)
    }
    loadHistory()
  }, [])

  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Recent Prompts</div>
      {loading ? (
        <div className="text-sm text-muted">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-muted">No prompts saved yet.</div>
      ) : (
        <ul className="text-sm space-y-1 max-h-[300px] overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="truncate">
              • {r.goal}
              <div className="text-xs text-muted">
                {new Date(r.created_at).toLocaleString('en-IN', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
