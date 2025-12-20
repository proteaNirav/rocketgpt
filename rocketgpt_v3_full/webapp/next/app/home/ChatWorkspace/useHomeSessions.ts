"use client";

import { useEffect, useState } from "react";

export type HomeSessionGroupKey = "today" | "thisWeek" | "earlier";

export interface HomeSession {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  group: HomeSessionGroupKey;
}

export interface HomeSessionGroup {
  key: HomeSessionGroupKey;
  label: string;
  sessions: HomeSession[];
}

interface UseHomeSessionsResult {
  groups: HomeSessionGroup[];
  loading: boolean;
  error: string | null;
  activeSessionId: string | null;
  selectSession: (id: string) => void;
}

/**
 * useHomeSessions
 * ---------------
 * STEP-9: Returns mock data shaped as groups for the Home sidebar.
 * STEP-9-E: Also tracks locally which session is active.
 * Later, only this hook needs to change to call a real /api/sessions endpoint.
 */
export function useHomeSessions(): UseHomeSessionsResult {
  const [groups, setGroups] = useState<HomeSessionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        setLoading(true);
        setError(null);

        // STEP-9: mock data.
        // TODO (later): Replace this block with a real fetch to your sessions API.
        const mockSessions: HomeSession[] = [
          {
            id: "home-chat-rgpt",
            title: "Home Chat — RocketGPT workspace",
            subtitle: "UI: Collapsible panes, sessions sidebar",
            badge: "Active",
            group: "today",
          },
          {
            id: "planner-api-debug",
            title: "Planner API debug",
            subtitle: "Rate-limit / quota error analysis",
            badge: "Recent",
            group: "today",
          },
          {
            id: "self-improve-review",
            title: "Self-Improve pipeline review",
            subtitle: "Review auto-heal + AI codegen paths",
            group: "thisWeek",
          },
          {
            id: "sql-tooling-ideas",
            title: "SQL tooling ideas",
            subtitle: "World-class SQL monitor & dev tool",
            group: "thisWeek",
          },
          {
            id: "ai-test-flow-crawl",
            title: "AI-Test Flow crawl setup",
            subtitle: "Demo crawl, safe-mode & RCA hooks",
            group: "earlier",
          },
        ];

        const grouped = [
          {
            key: "today",
            label: "Today",
            sessions: mockSessions.filter((s) => s.group === "today"),
          },
          {
            key: "thisWeek",
            label: "This week",
            sessions: mockSessions.filter((s) => s.group === "thisWeek"),
          },
          {
            key: "earlier",
            label: "Earlier",
            sessions: mockSessions.filter((s) => s.group === "earlier"),
          },
        ].filter((g) => g.sessions.length > 0);

        if (!cancelled) {
          setGroups(grouped as any);

          // If no active session yet, default to the first available session
          if (!activeSessionId) {
            const first = grouped.flatMap((g) => g.sessions)[0];
            if (first) {
              setActiveSessionId(first.id);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load sessions (mock).");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      cancelled = true;
    };
  }, [activeSessionId]);

  const selectSession = (id: string) => {
    setActiveSessionId(id);
  };

  return { groups, loading, error, activeSessionId, selectSession };
}

