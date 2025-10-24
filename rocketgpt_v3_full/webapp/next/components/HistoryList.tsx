'use client'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'

interface HistoryItem {
  id?: string
  goal: string
  created_at?: string
}

export function HistoryList({ onRerun }: { onRerun: (goal: string) => void }) {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const sb = getSupabase()
        if (!sb) throw new Error('Supabase not configured.')
        const { data, error } = await sb
          .from('user_prompts')
          .select('id, goal, created_at')
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setItems(data || [])
      } catch (err: any) {
        console.warn('⚠️ History fetch failed:', err.message)
        setError('Could not load your history.')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  return (
    <div className="card p-4">
      <div className="font-semibold mb-2 flex justify-between items-center">
        <span>Recent Prompts</span>
        {loading && <span className="text-xs text-muted">Loading…</span>}
      </div>

      {error && (
        <div className="text-sm text-red-500 mb-2">
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="text-sm text-muted">No recent prompts yet.</div>
      ) : (
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex justify-between items-center p-2 rounded-md hover:bg-panel cursor-pointer transition"
              onClick={() => onRerun(it.goal)}
              title={it.goal}
            >
              <span className="truncate text-sm">• {it.goal}</span>
              {it.created_at && (
                <span className="text-xs text-muted">
                  {new Date(it.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button
                className="btn-xs ml-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onRerun(it.goal)
                }}
              >
                Re-run
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
