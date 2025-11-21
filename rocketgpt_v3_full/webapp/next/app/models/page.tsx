"use client";

import React, { useMemo, useState } from "react";

type ModelProvider = "openai" | "claude" | "gemini" | "llama";
type ModelCategory = "chat" | "reasoning" | "embedding";
type ModelStatus = "available" | "degraded" | "offline";

interface ModelRow {
  id: string;
  name: string;
  provider: ModelProvider;
  category: ModelCategory;
  status: ModelStatus;
  updatedAt: string;
}

const MOCK_MODELS: ModelRow[] = [
  {
    id: "1",
    name: "gpt-4.1",
    provider: "openai",
    category: "chat",
    status: "available",
    updatedAt: "2025-11-18",
  },
  {
    id: "2",
    name: "gpt-4.1-mini",
    provider: "openai",
    category: "chat",
    status: "available",
    updatedAt: "2025-11-18",
  },
  {
    id: "3",
    name: "gpt-4.1-reasoning",
    provider: "openai",
    category: "reasoning",
    status: "degraded",
    updatedAt: "2025-11-17",
  },
  {
    id: "4",
    name: "claude-3.5-sonnet",
    provider: "claude",
    category: "chat",
    status: "available",
    updatedAt: "2025-11-16",
  },
  {
    id: "5",
    name: "gemini-2.0-flash-thinking",
    provider: "gemini",
    category: "reasoning",
    status: "offline",
    updatedAt: "2025-11-15",
  },
];

export default function ModelsPage() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | ModelProvider>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ModelCategory>("all");

  const filtered = useMemo(() => {
    return MOCK_MODELS.filter((m) => {
      if (providerFilter !== "all" && m.provider !== providerFilter) return false;
      if (categoryFilter !== "all" && m.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (!m.name.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [search, providerFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground">
          Available AI models integrated into RocketGPT, including chat, reasoning, and embedding models.
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="w-full md:max-w-md">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Search models
            </label>
            <div className="flex items-center rounded-lg border bg-background/60 px-2">
              <span className="mr-1 text-xs text-muted-foreground">🔍</span>
              <input
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                placeholder="Search by model name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Provider filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Provider
            </label>
            <select
              className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="llama">Llama</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Category
            </label>
            <select
              className="h-8 rounded-lg border bg-background/60 px-2 text-sm outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
            >
              <option value="all">All</option>
              <option value="chat">Chat</option>
              <option value="reasoning">Reasoning</option>
              <option value="embedding">Embedding</option>
            </select>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <ModelsTable rows={filtered} />
      </section>
    </div>
  );
}

interface ModelsTableProps {
  rows: ModelRow[];
}

function ModelsTable({ rows }: ModelsTableProps) {
  if (!rows.length) {
    return (
      <div className="flex min-h-[120px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
        <p className="font-medium">No models found.</p>
        <p className="text-xs">
          Try adjusting search text or filters.
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
            <th className="px-3 py-2 text-left font-medium">Provider</th>
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
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
              <td className="px-3 py-2 capitalize">{row.provider}</td>
              <td className="px-3 py-2 capitalize">{row.category}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
              <td className="px-3 py-2">{row.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ModelStatus }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";

  if (status === "available") {
    return (
      <span className={base + " bg-emerald-500/10 text-emerald-400 border border-emerald-600/40"}>
        Available
      </span>
    );
  }

  if (status === "degraded") {
    return (
      <span className={base + " bg-amber-500/10 text-amber-300 border border-amber-500/40"}>
        Degraded
      </span>
    );
  }

  return (
    <span className={base + " bg-rose-500/10 text-rose-300 border border-rose-600/40"}>
      Offline
    </span>
  );
}
