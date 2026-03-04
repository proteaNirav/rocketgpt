"use client";

import { useMemo, useState } from "react";

import { CatCatalogItem } from "@/lib/cats-seed";

type SideEffect = CatCatalogItem["allowed_side_effects"][number];
type Status = CatCatalogItem["status"];
type SortBy = "name" | "status" | "last_updated";

const STATUS_OPTIONS: Array<"all" | Status> = ["all", "proposed", "draft", "approved", "blocked", "deprecated"];
const EFFECT_OPTIONS: Array<"all" | SideEffect> = ["all", "none", "read_only", "ledger_write", "workflow_dispatch"];

type PaletteProps = {
  cats: CatCatalogItem[];
  onAddCat: (item: CatCatalogItem) => void;
};

export default function Palette({ cats, onAddCat }: PaletteProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [effectFilter, setEffectFilter] = useState<"all" | SideEffect>("all");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = cats.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (effectFilter !== "all" && !item.allowed_side_effects.includes(effectFilter)) return false;
      if (!q) return true;

      const haystack = [item.name, item.canonical_name, item.purpose, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(q);
    });

    return filtered.sort((a, b) => {
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "last_updated") return b.last_updated.localeCompare(a.last_updated);
      return a.name.localeCompare(b.name);
    });
  }, [cats, effectFilter, query, sortBy, statusFilter]);

  return (
    <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800" aria-label="CAT palette">
      <h2 className="text-lg font-semibold">CAT Palette</h2>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs">
          Search
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, canonical, purpose, tags"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | Status)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs">
            Side-effect
            <select
              value={effectFilter}
              onChange={(event) => setEffectFilter(event.target.value as "all" | SideEffect)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {EFFECT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs">
            Sort
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="last_updated">Last Updated</option>
            </select>
          </label>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">{rows.length} of {cats.length} CATs</p>

      <div className="mt-3 max-h-[34rem] space-y-2 overflow-auto pr-1">
        {rows.length === 0 ? (
          <div className="rounded border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
            No CATs match your filters.
          </div>
        ) : (
          rows.map((item) => (
            <div
              key={item.cat_id}
              className="rounded border border-gray-200 p-2 dark:border-neutral-700"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", item.cat_id);
                event.dataTransfer.effectAllowed = "copy";
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{item.name}</span>
                    {item.tags.includes("dynamic") ? (
                      <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                        Dynamic
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-300">{item.cat_id}</div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.purpose}</div>
                </div>
                <button
                  onClick={() => onAddCat(item)}
                  className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Add
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
