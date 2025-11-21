"use client";

import React, { useMemo, useState } from "react";

type RunbookStatus = "active" | "draft" | "disabled";

interface RunbookRow {
  id: string;
  name: string;
  status: RunbookStatus;
  lastRun: string;
  description: string;
}

const MOCK_RUNBOOKS: RunbookRow[] = [
  {
    id: "1",
    name: "Self-Improve: Feedback Evaluator",
    status: "active",
    lastRun: "2025-11-18",
    description: "Collects user feedback and pushes items to backlog.",
  },
  {
    id: "2",
    name: "CI Auto-Heal: Workflow Repair",
    status: "draft",
    lastRun: "Never",
    description: "Diagnoses broken GitHub workflow files and auto-commits patches.",
  },
  {
    id: "3",
    name: "Text-Guard Enforcement",
    status: "active",
    lastRun: "2025-11-17",
    description: "Sanitizes inputs to prevent unsafe PR content.",
  },
  {
    id: "4",
    name: "Nightly Charging Cycle",
    status: "disabled",
    lastRun: "2025-10-01",
    description: "Performs nightly refresh of system tokens and model weights.",
  },
];

export default function RunbooksPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RunbookStatus>("all");

  const filtered = useMemo(() => {
    return MOCK_RUNBOOKS.filter((rb) => {
      if (statusFilter !== "all" && rb.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!rb.name.toLowerCase().includes(q)) return false;
        if (!rb.description.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Runbooks</h1>
        <p className="text-sm text-muted-foreground">
          Automation workflows that help RocketGPT self-improve, self-heal, and stay production-ready.
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        {/* Search + Filters row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="w-full md:max-w-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search runbooks
            </label>
            <div className="flex items-center rounded-lg border bg-background/60 px-2">
              <span className="mr-1 text-xs text-muted-foreground">🔍</span>
              <input
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="Search by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <RunbooksTable rows={filtered} />
      </section>
    </div>
  );
}

interface RunbooksTableProps {
  rows: RunbookRow[];
}

function RunbooksTable({ rows }: RunbooksTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="font-medium">No runbooks found.</p>
        <p className="text-xs">
          Try adjusting search text or filters to broaden results.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Last run</th>
            <th className="px-3 py-2 text-left font-medium">Description</th>
            <th className="px-3 py-2 text-left font-medium"></th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
              <td className="px-3 py-2">{row.lastRun}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
              <td className="px-3 py-2 text-right">
                <RunNowButton />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: RunbookStatus }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (status === "active") {
    return (
      <span className={base + " bg-emerald-500/10 text-emerald-400 border border-emerald-600/40"}>
        Active
      </span>
    );
  }

  if (status === "draft") {
    return (
      <span className={base + " bg-sky-500/10 text-sky-300 border border-sky-500/40"}>
        Draft
      </span>
    );
  }

  return (
    <span className={base + " bg-rose-500/10 text-rose-300 border border-rose-600/40"}>
      Disabled
    </span>
  );
}

function RunNowButton() {
  return (
    <button
      type="button"
      className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted/30 transition-colors"
    >
      Run now
    </button>
  );
}
