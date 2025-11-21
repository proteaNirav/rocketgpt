"use client";

import React, { useEffect, useState } from "react";

type SessionSummary = {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
};

type SessionsList = {
  today: SessionSummary[];
  recent: SessionSummary[];
};

export function SessionsPane() {
  const [sessions, setSessions] = useState<SessionsList | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/sessions");
        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setError(`Failed to load sessions (${res.status})`);
            // eslint-disable-next-line no-console
            console.error("Sessions API error:", res.status, text);
          }
          return;
        }

        const data = (await res.json()) as SessionsList;
        if (!cancelled) {
          setSessions(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Network error while loading sessions.");
        }
        // eslint-disable-next-line no-console
        console.error("Sessions API request failed:", err);
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
  }, []);

  const renderGroup = (label: string, items: SessionSummary[] | undefined) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">
          {label}
        </div>
        <div className="space-y-1">
          {items.map((s) => (
            <button
              key={s.id}
              className="w-full text-left rounded-md px-3 py-2 hover:bg-muted transition-colors"
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate text-sm">{s.title}</div>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {s.model}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <aside className="hidden md:flex md:flex-col w-64 border-r bg-background">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sessions</h2>
        <button
          type="button"
          className="text-xs rounded-md px-2 py-1 bg-primary text-primary-foreground hover:opacity-90"
        >
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 text-sm">
        {loading && (
          <div className="text-xs text-muted-foreground">
            Loading sessions…
          </div>
        )}

        {error && !loading && (
          <div className="text-xs text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && sessions && (
          <>
            {renderGroup("Today", sessions.today)}
            {renderGroup("Recent", sessions.recent)}
          </>
        )}

        {!loading && !error && !sessions && (
          <div className="text-xs text-muted-foreground">
            No sessions yet. Start a new conversation to see it here.
          </div>
        )}
      </div>
    </aside>
  );
}
