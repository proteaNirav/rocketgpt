"use client";

import React, { useMemo, useState } from "react";

type SessionStatus = "active" | "expired";

interface SessionRow {
  id: string;
  title: string;
  model: string;
  status: SessionStatus;
  lastUpdated: string;
}

const MOCK_SESSIONS: SessionRow[] = [
  {
    id: "1",
    title: "UI Fix Discussion",
    model: "gpt-4.1",
    status: "active",
    lastUpdated: "2025-11-20",
  },
  {
    id: "2",
    title: "RLS Repair Debug",
    model: "gpt-4.1",
    status: "active",
    lastUpdated: "2025-11-19",
  },
  {
    id: "3",
    title: "Self-Improve Backlog",
    model: "gpt-4.1-mini",
    status: "expired",
    lastUpdated: "2025-11-18",
  },
  {
    id: "4",
    title: "CORS Investigation",
    model: "gpt-4.1",
    status: "expired",
    lastUpdated: "2025-11-17",
  },
];

export default function SessionsPage() {
  const [tab, setTab] = useState<"all" | "active" | "expired">("active");
  const [search, setSearch] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return MOCK_SESSIONS.filter((s) => {
      if (tab === "active" && s.status !== "active") return false;
      if (tab === "expired" && s.status !== "expired") return false;

      if (modelFilter !== "all" && s.model !== modelFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!s.title.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [tab, search, modelFilter]);

  const models = Array.from(new Set(MOCK_SESSIONS.map((s) => s.model)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Review, search, and filter RocketGPT chat sessions by status, model, and time.
        </p>
      </header>

      {/* Tabs + Filters */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <TabButton
            label="Active"
            isActive={tab === "active"}
            onClick={() => setTab("active")}
            count={MOCK_SESSIONS.filter((s) => s.status === "active").length}
          />
          <TabButton
            label="Expired"
            isActive={tab === "expired"}
            onClick={() => setTab("expired")}
            count={MOCK_SESSIONS.filter((s) => s.status === "expired").length}
          />
          <TabButton
            label="All"
            isActive={tab === "all"}
            onClick={() => setTab("all")}
            count={MOCK_SESSIONS.length}
          />
        </div>

        {/* Search + Filters row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="w-full md:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search sessions
            </label>
            <div className="flex items-center rounded-lg border bg-background/60 px-2">
              <span className="mr-1 text-xs text-muted-foreground">🔍</span>
              <input
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="Search by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Model filter */}
          <div className="flex gap-3 md:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Model
              </label>
              <select
                className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
              >
                <option value="all">All models</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Table section */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <SessionsTable rows={filtered} />
      </section>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}

function TabButton({ label, isActive, onClick, count }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background/60 text-muted-foreground hover:bg-muted/40",
      ].join(" ")}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={[
            "inline-flex items-center justify-center rounded-full min-w-[2rem] px-1.5 text-[10px] font-semibold",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted/80 text-foreground",
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

interface SessionsTableProps {
  rows: SessionRow[];
}

function SessionsTable({ rows }: SessionsTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="font-medium">No sessions found.</p>
        <p className="text-xs">
          Try adjusting search text, filters, or switching tabs.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Title</th>
            <th className="px-3 py-2 text-left font-medium">Model</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Last Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2">{row.title}</td>
              <td className="px-3 py-2">{row.model}</td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2">{row.lastUpdated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";

  if (status === "active") {
    return (
      <span className={base + " bg-emerald-500/10 text-emerald-400 border border-emerald-600/40"}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }

  return (
    <span className={base + " bg-amber-500/10 text-amber-300 border border-amber-500/40"}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
      Expired
    </span>
  );
}

