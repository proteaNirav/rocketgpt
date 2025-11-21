"use client";

import React, { useMemo, useState } from "react";

type LogLevel = "info" | "warn" | "error";
type LogSource = "api" | "ui" | "worker" | "self-improve";

interface LogRow {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
}

const MOCK_LOGS: LogRow[] = [
  {
    id: "1",
    timestamp: "2025-11-20 05:20:13",
    level: "info",
    source: "api",
    message: "Health check OK for /api/health.",
  },
  {
    id: "2",
    timestamp: "2025-11-20 05:10:42",
    level: "warn",
    source: "self-improve",
    message: "Backlog item IMP-0007 missing linked runbook.",
  },
  {
    id: "3",
    timestamp: "2025-11-19 22:04:11",
    level: "error",
    source: "worker",
    message: "Self-improve worker failed to fetch GitHub PR details.",
  },
  {
    id: "4",
    timestamp: "2025-11-19 19:31:55",
    level: "info",
    source: "ui",
    message: "User opened Sessions page.",
  },
];

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | LogLevel>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | LogSource>("all");

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (sourceFilter !== "all" && log.source !== sourceFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!log.message.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [search, levelFilter, sourceFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground">
          High-level view of RocketGPT application logs from UI, API, workers, and self-improve jobs.
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="w-full md:max-w-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search logs
            </label>
            <div className="flex items-center rounded-lg border bg-background/60 px-2">
              <span className="mr-1 text-xs text-muted-foreground">🔍</span>
              <input
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="Search by message..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Level filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Level
            </label>
            <select
              className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Source filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Source
            </label>
            <select
              className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="api">API</option>
              <option value="ui">UI</option>
              <option value="worker">Worker</option>
              <option value="self-improve">Self-Improve</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <LogsTable rows={filtered} />
      </section>
    </div>
  );
}

interface LogsTableProps {
  rows: LogRow[];
}

function LogsTable({ rows }: LogsTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="font-medium">No logs found.</p>
        <p className="text-xs">Try adjusting search text or filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Time</th>
            <th className="px-3 py-2 text-left font-medium">Level</th>
            <th className="px-3 py-2 text-left font-medium">Source</th>
            <th className="px-3 py-2 text-left font-medium">Message</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2 whitespace-nowrap">{row.timestamp}</td>
              <td className="px-3 py-2">
                <LevelBadge level={row.level} />
              </td>
              <td className="px-3 py-2 capitalize">{row.source}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LevelBadge({ level }: { level: LogLevel }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (level === "info") {
    return (
      <span className={base + " bg-sky-500/10 text-sky-300 border border-sky-500/40"}>
        Info
      </span>
    );
  }

  if (level === "warn") {
    return (
      <span className={base + " bg-amber-500/10 text-amber-300 border border-amber-500/40"}>
        Warn
      </span>
    );
  }

  return (
    <span className={base + " bg-rose-500/10 text-rose-300 border border-rose-600/40"}>
      Error
    </span>
  );
}
