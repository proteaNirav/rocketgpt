"use client";

import { useMemo, useState } from "react";

type SessionStatus = "Active" | "Expired";

interface SessionSummary {
  id: string;
  model: string;
  createdAt: string;
  lastActiveAt: string;
  status: SessionStatus;
}

const statusClassName = (status: SessionStatus) => {
  switch (status) {
    case "Active":
      return "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium";
    case "Expired":
      return "inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-medium";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium";
  }
};

type StatusFilter = "all" | "active" | "expired";

interface SessionsTableProps {
  sessions: SessionSummary[];
  error: string | null;
}

export function SessionsTable({ sessions, error }: SessionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (search) {
        const term = search.toLowerCase();
        const inId = session.id.toLowerCase().includes(term);
        const inModel = session.model.toLowerCase().includes(term);
        if (!inId && !inModel) {
          return false;
        }
      }

      if (statusFilter === "active" && session.status !== "Active") {
        return false;
      }
      if (statusFilter === "expired" && session.status !== "Expired") {
        return false;
      }

      return true;
    });
  }, [sessions, search, statusFilter]);

  const hasSessions = sessions.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="Search sessions..."
          className="border rounded-md px-3 py-2 text-sm w-full max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border rounded-md px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Session ID</th>
              <th className="text-left p-3 font-medium">Model</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-left p-3 font-medium">Last Active</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!hasSessions && !error ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-sm text-muted-foreground"
                >
                  No sessions yet. New conversations will appear here once users
                  start chatting with RocketGPT.
                </td>
              </tr>
            ) : filteredSessions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-sm text-muted-foreground"
                >
                  No sessions match your filters. Adjust the search or status
                  filter to see more results.
                </td>
              </tr>
            ) : (
              filteredSessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-t hover:bg-muted/60 transition-colors"
                >
                  <td className="p-3 font-mono text-xs">{session.id}</td>
                  <td className="p-3">{session.model}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {session.createdAt}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {session.lastActiveAt}
                  </td>
                  <td className="p-3">
                    <span className={statusClassName(session.status)}>
                      {session.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button className="text-xs font-medium underline">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
