"use client";

import React from "react";
import { useHomeSessions } from "./useHomeSessions";

export default function LeftSessionsPane() {
  const { groups, loading, error, activeSessionId, selectSession } =
    useHomeSessions();

  return (
    <aside className="h-full bg-slate-950/60 border-r border-slate-900/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-800/80">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Sessions
          </span>
          <span className="text-[11px] text-slate-500">
            Recent conversations & workspaces
          </span>
        </div>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <span className="mr-1 text-[13px] leading-none">＋</span>
          <span>New</span>
        </button>
      </div>

      {/* Search box */}
      <div className="px-3 pt-2 pb-3 border-b border-slate-900/60">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search sessions (UI-only)..."
            className="w-full rounded-md border border-slate-800 bg-slate-950/70 pl-7 pr-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/80 focus:border-emerald-500/80"
            disabled={true}
          />
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-3 text-xs">
        {loading && (
          <div className="px-2 pt-2 text-[11px] text-slate-500">
            Loading sessions...
          </div>
        )}

        {error && !loading && (
          <div className="px-2 pt-2 text-[11px] text-rose-400">
            {error}
          </div>
        )}

        {!loading && !error && groups.length === 0 && (
          <div className="px-2 pt-2 text-[11px] text-slate-500">
            No sessions yet. New conversations will appear here.
          </div>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <div key={group.key}>
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    title={session.title}
                    subtitle={session.subtitle}
                    badge={session.badge}
                    isActive={session.id === activeSessionId}
                    onClick={() => selectSession(session.id)}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Footer hint */}
      <div className="border-t border-slate-900/80 px-3 py-2 text-[10px] text-slate-500">
        Sessions are currently loaded from a local mock hook.
        <br />
        Active selection is local-only for now.
      </div>
    </aside>
  );
}

type SessionItemProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  isActive?: boolean;
  onClick?: () => void;
};

function SessionItem({ title, subtitle, badge, isActive, onClick }: SessionItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "group w-full rounded-md border px-2 py-1.5 text-left text-[11px] " +
        (isActive
          ? "border-emerald-500/80 bg-emerald-600/15 text-emerald-50"
          : "border-transparent bg-slate-900/40 text-slate-200 hover:border-slate-700 hover:bg-slate-900/80")
      }
    >
      <div className="flex items-center justify-between">
        <span className="line-clamp-1 font-medium text-[11px] group-hover:text-emerald-200">
          {title}
        </span>
        {badge && (
          <span className="ml-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-emerald-200">
            {badge}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-0.5 line-clamp-2 text-[10px] text-slate-500 group-hover:text-slate-300">
          {subtitle}
        </div>
      )}
    </button>
  );
}
