'use client'

import { useEffect, useState } from 'react'

export type HomeSessionGroupKey = 'today' | 'thisWeek' | 'earlier'

export interface HomeSession {
  id: string
  title: string
  subtitle?: string
  badge?: string
  group: HomeSessionGroupKey
}

export interface HomeSessionGroup {
  key: HomeSessionGroupKey
  label: string
  sessions: HomeSession[]
}

interface UseHomeSessionsResult {
  groups: HomeSessionGroup[]
  loading: boolean
  error: string | null
  activeSessionId: string | null
  selectSession: (id: string) => void
  isAuthenticated: boolean
}

/**
 * useHomeSessions
 * ---------------
 * Phase-1: Sessions are only shown for authenticated users.
 * Anonymous users see an empty state with sign-in prompt.
 *
 * TODO: Wire to real auth provider (Supabase/NextAuth).
 */
export function useHomeSessions(): UseHomeSessionsResult {
  const [groups, setGroups] = useState<HomeSessionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  // Phase-1: Default to NOT authenticated - safer for privacy
  // TODO: Replace with real auth check (e.g., useSession from next-auth or Supabase)
  const [isAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false

    async function loadSessions() {
      try {
        setLoading(true)
        setError(null)

        // Phase-1 Privacy Rule: Do NOT show historical sessions for anonymous users
        if (!isAuthenticated) {
          if (!cancelled) {
            setGroups([])
            setActiveSessionId(null)
          }
          return
        }

        // Only load sessions when authenticated
        // TODO: Replace mock data with real /api/sessions call
        const mockSessions: HomeSession[] = [
          {
            id: 'home-chat-rgpt',
            title: 'Home Chat - RocketGPT workspace',
            subtitle: 'UI: Collapsible panes, sessions sidebar',
            badge: 'Active',
            group: 'today',
          },
          {
            id: 'planner-api-debug',
            title: 'Planner API debug',
            subtitle: 'Rate-limit / quota error analysis',
            badge: 'Recent',
            group: 'today',
          },
          {
            id: 'self-improve-review',
            title: 'Self-Improve pipeline review',
            subtitle: 'Review auto-heal + AI codegen paths',
            group: 'thisWeek',
          },
        ]

        const grouped = [
          {
            key: 'today',
            label: 'Today',
            sessions: mockSessions.filter((s) => s.group === 'today'),
          },
          {
            key: 'thisWeek',
            label: 'This week',
            sessions: mockSessions.filter((s) => s.group === 'thisWeek'),
          },
          {
            key: 'earlier',
            label: 'Earlier',
            sessions: mockSessions.filter((s) => s.group === 'earlier'),
          },
        ].filter((g) => g.sessions.length > 0)

        if (!cancelled) {
          setGroups(grouped as HomeSessionGroup[])

          if (!activeSessionId) {
            const first = grouped.flatMap((g) => g.sessions)[0]
            if (first) {
              setActiveSessionId(first.id)
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError('Failed to load sessions.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSessions()

    return () => {
      cancelled = true
    }
  }, [activeSessionId, isAuthenticated])

  const selectSession = (id: string) => {
    setActiveSessionId(id)
  }

  return { groups, loading, error, activeSessionId, selectSession, isAuthenticated }
}
