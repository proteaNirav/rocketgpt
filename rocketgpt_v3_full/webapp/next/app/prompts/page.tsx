"use client";

import React, { useMemo, useState } from "react";

type PromptKind = "system" | "user" | "tool";

interface PromptRow {
  id: string;
  name: string;
  kind: PromptKind;
  tags: string[];
  updatedAt: string;
}

const MOCK_PROMPTS: PromptRow[] = [
  {
    id: "1",
    name: "RocketGPT – Default System Prompt",
    kind: "system",
    tags: ["core", "production"],
    updatedAt: "2025-11-18",
  },
  {
    id: "2",
    name: "SQL Performance Specialist",
    kind: "user",
    tags: ["sql", "performance", "hrms"],
    updatedAt: "2025-11-17",
  },
  {
    id: "3",
    name: "Prompt Formulator – Review & Refine",
    kind: "tool",
    tags: ["formulator", "review"],
    updatedAt: "2025-11-16",
  },
  {
    id: "4",
    name: "CCTV Proposal Drafting Assistant",
    kind: "user",
    tags: ["cctv", "proposal"],
    updatedAt: "2025-11-15",
  },
];

export default function PromptsPage() {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | PromptKind>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    MOCK_PROMPTS.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    return MOCK_PROMPTS.filter((p) => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;

      if (tagFilter !== "all" && !p.tags.includes(tagFilter)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!p.name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [search, kindFilter, tagFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Prompts library</h1>
        <p className="text-sm text-muted-foreground">
          Central catalogue of curated prompts used across RocketGPT workflows.
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        {/* Search + Filters row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="w-full md:max-w-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search prompts
            </label>
            <div className="flex items-center rounded-lg border bg-background/60 px-2">
              <span className="mr-1 text-xs text-muted-foreground">🔍</span>
              <input
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="Search by prompt name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Kind + Tag filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Prompt type
              </label>
              <select
                className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value as any)}
              >
                <option value="all">All types</option>
                <option value="system">System</option>
                <option value="user">User</option>
                <option value="tool">Tool</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Tag
              </label>
              <select
                className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="all">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <PromptsTable rows={filtered} />
      </section>
    </div>
  );
}

interface PromptsTableProps {
  rows: PromptRow[];
}

function PromptsTable({ rows }: PromptsTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="font-medium">No prompts found.</p>
        <p className="text-xs">
          Try adjusting search text or filters to broaden the results.
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
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Tags</th>
            <th className="px-3 py-2 text-left font-medium">Last updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2">
                <KindBadge kind={row.kind} />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {row.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">{row.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KindBadge({ kind }: { kind: PromptKind }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (kind === "system") {
    return (
      <span className={base + " bg-purple-500/10 text-purple-300 border border-purple-500/40"}>
        System
      </span>
    );
  }

  if (kind === "tool") {
    return (
      <span className={base + " bg-sky-500/10 text-sky-300 border border-sky-500/40"}>
        Tool
      </span>
    );
  }

  return (
    <span className={base + " bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"}>
      User
    </span>
  );
}
