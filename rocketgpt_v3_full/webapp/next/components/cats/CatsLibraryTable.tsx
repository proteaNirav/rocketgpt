"use client";

import { useMemo, useState } from "react";

import { buildReplayCommand } from "@/lib/cats-replay";
import { CatCatalogItem, SEED_CATS } from "@/lib/cats-seed";
import { isDemoMode } from "@/lib/demo-mode";

type SideEffect = CatCatalogItem["allowed_side_effects"][number];
type Status = CatCatalogItem["status"];
type SortBy = "name" | "status" | "last_updated";

const STATUS_OPTIONS: Array<"all" | Status> = ["all", "proposed", "draft", "approved", "blocked", "deprecated"];
const EFFECT_OPTIONS: Array<"all" | SideEffect> = ["all", "none", "read_only", "ledger_write", "workflow_dispatch"];

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function statusBadgeClass(status: Status): string {
  switch (status) {
    case "approved":
      return "border-green-300 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200";
    case "draft":
      return "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200";
    case "blocked":
      return "border-red-300 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200";
    case "deprecated":
      return "border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200";
    default:
      return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200";
  }
}

export default function CatsLibraryTable() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [effectFilter, setEffectFilter] = useState<"all" | SideEffect>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [jsonItem, setJsonItem] = useState<CatCatalogItem | null>(null);
  const [copiedCatId, setCopiedCatId] = useState<string | null>(null);

  const demoMode = isDemoMode();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = SEED_CATS.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (effectFilter !== "all" && !item.allowed_side_effects.includes(effectFilter)) return false;
      if (!q) return true;

      const haystack = [item.name, item.canonical_name, item.purpose, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "last_updated") return b.last_updated.localeCompare(a.last_updated);
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }, [effectFilter, query, sortBy, statusFilter]);

  async function copyReplayCommand(item: CatCatalogItem) {
    const cmd = buildReplayCommand(item.cat_id);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCatId(item.cat_id);
      window.setTimeout(() => setCopiedCatId((current) => (current === item.cat_id ? null : current)), 1400);
    } catch {
      setCopiedCatId(null);
      window.alert("Unable to copy command from this browser context.");
    }
  }

  return (
    <div className="space-y-4">
      {demoMode ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Demo mode (Supabase not configured) — showing seed catalog
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="text-sm md:col-span-2">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Search</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, canonical, purpose, tags"
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <label className="text-sm">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Status</div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Side-effect</div>
          <select
            value={effectFilter}
            onChange={(event) => setEffectFilter(event.target.value as "all" | SideEffect)}
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {EFFECT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{rows.length} of {SEED_CATS.length} catalog items</span>
        <label className="inline-flex items-center gap-2">
          <span>Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortBy)}
            className="rounded border border-gray-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="last_updated">Last Updated</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-800">
        <table className="min-w-[1500px] w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Canonical</th>
              <th className="p-2">ID</th>
              <th className="p-2">Purpose</th>
              <th className="p-2">Version</th>
              <th className="p-2">Status</th>
              <th className="p-2">Side-effects</th>
              <th className="p-2">Passport</th>
              <th className="p-2">Approval</th>
              <th className="p-2">Tags</th>
              <th className="p-2">Last Updated</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.cat_id} className="border-t border-gray-200 align-top dark:border-neutral-800">
                <td className="p-2 font-medium">{item.name}</td>
                <td className="p-2 font-mono text-xs">{item.canonical_name}</td>
                <td className="p-2 font-mono text-xs">{item.cat_id}</td>
                <td className="p-2">{item.purpose}</td>
                <td className="p-2">{item.version}</td>
                <td className="p-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-2">{item.allowed_side_effects.join(", ")}</td>
                <td className="p-2">{item.passport_required ? "Required" : "Optional"}</td>
                <td className="p-2">{item.requires_approval ? "Required" : "Not required"}</td>
                <td className="p-2 text-xs">{item.tags.join(", ")}</td>
                <td className="p-2">{item.last_updated}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setJsonItem(item)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      View JSON
                    </button>
                    <button
                      onClick={() => void copyReplayCommand(item)}
                      className="rounded border border-sky-300 px-2 py-1 text-xs text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-200 dark:hover:bg-sky-950/30"
                    >
                      {copiedCatId === item.cat_id ? "Copied" : "Copy Replay"}
                    </button>
                    <button
                      onClick={() => downloadJson(`${item.cat_id}.json`, item)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      Download JSON
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {jsonItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-xl border border-gray-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">{jsonItem.name} JSON</h3>
              <button
                onClick={() => setJsonItem(null)}
                className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-[12px] dark:border-neutral-800 dark:bg-neutral-900/40">
              {JSON.stringify(jsonItem, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
