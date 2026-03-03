"use client";

import { useEffect, useMemo, useState } from "react";

import { buildReplayCommand } from "@/lib/cats-replay";
import { getCatsForUi } from "@/lib/cats-for-ui";
import { recordCatsUsage } from "@/lib/cats-usage";
import { useDebouncedValue } from "@/lib/debounce";
import { publishNotification } from "@/lib/notify";
import { CatCatalogItem } from "@/lib/cats-seed";
import { isDemoMode } from "@/lib/demo-mode";

type SideEffect = CatCatalogItem["allowed_side_effects"][number];
type Status = CatCatalogItem["status"];
type Owner = CatCatalogItem["owner"];

type SortColumn = "name" | "canonical_name" | "cat_id" | "version" | "status" | "last_updated";
type SortDirection = "asc" | "desc";

const STATUS_OPTIONS: Array<"all" | Status> = ["all", "proposed", "draft", "approved", "blocked", "deprecated"];

function downloadJson(filename: string, payload: unknown): void {
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

function compareValues(a: string, b: string, direction: SortDirection): number {
  const result = a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function sortRows(rows: CatCatalogItem[], column: SortColumn, direction: SortDirection): CatCatalogItem[] {
  return [...rows].sort((a, b) => compareValues(String(a[column] ?? ""), String(b[column] ?? ""), direction));
}

function pageRange(total: number, page: number, pageSize: number): { start: number; end: number } {
  if (total === 0) return { start: 0, end: 0 };
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return { start, end };
}

function includesToken(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export default function CatsLibraryTable() {
  const demoMode = isDemoMode();

  const [catsVersion, setCatsVersion] = useState(0);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [effectFilter, setEffectFilter] = useState<"all" | SideEffect>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | Owner>("all");
  const [onlyDynamic, setOnlyDynamic] = useState(false);

  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [jsonItem, setJsonItem] = useState<CatCatalogItem | null>(null);
  const [copiedCatId, setCopiedCatId] = useState<string | null>(null);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "rgpt.cats.dynamic.v1") {
        setCatsVersion((value) => value + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const allCats = useMemo(() => {
    void catsVersion;
    return getCatsForUi();
  }, [catsVersion]);

  const effectOptions = useMemo(() => {
    const set = new Set<SideEffect>();
    allCats.forEach((item) => item.allowed_side_effects.forEach((effect) => set.add(effect)));
    return ["all", ...Array.from(set).sort()] as Array<"all" | SideEffect>;
  }, [allCats]);

  const owners = useMemo(() => {
    const set = new Set<Owner>();
    allCats.forEach((item) => {
      if (item.owner) set.add(item.owner);
    });
    return Array.from(set).sort();
  }, [allCats]);

  const filteredRows = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const tagNeedle = tagFilter.trim().toLowerCase();

    return allCats.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (effectFilter !== "all" && !item.allowed_side_effects.includes(effectFilter)) return false;
      if (ownerFilter !== "all" && item.owner !== ownerFilter) return false;
      if (onlyDynamic && !item.tags.includes("dynamic")) return false;
      if (tagNeedle && !item.tags.some((tag) => includesToken(tag, tagNeedle))) return false;

      if (!q) return true;
      const haystack = [
        item.name,
        item.canonical_name,
        item.purpose,
        item.cat_id,
        item.tags.join(" "),
        item.version,
        item.status,
        item.allowed_side_effects.join(" "),
      ].join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [allCats, debouncedQuery, effectFilter, onlyDynamic, ownerFilter, statusFilter, tagFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortColumn, sortDirection), [filteredRows, sortColumn, sortDirection]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(sortedRows.length / pageSize)), [pageSize, sortedRows.length]);

  useEffect(() => {
    setPage((current) => Math.min(Math.max(1, current), pageCount));
  }, [pageCount]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [page, pageSize, sortedRows]);

  const range = useMemo(() => pageRange(sortedRows.length, page, pageSize), [sortedRows.length, page, pageSize]);

  function toggleSort(column: SortColumn): void {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortColumn(column);
    setSortDirection("asc");
  }

  function sortIndicator(column: SortColumn): string {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  async function copyReplayCommand(item: CatCatalogItem): Promise<void> {
    const command = buildReplayCommand(item.cat_id);
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCatId(item.cat_id);
      recordCatsUsage({
        catId: item.cat_id,
        canonicalName: item.canonical_name,
        action: "copy_replay",
      });
      publishNotification({
        level: "success",
        title: "Replay Copied",
        message: `${item.cat_id} replay command copied.`,
      });
      window.setTimeout(() => setCopiedCatId((current) => (current === item.cat_id ? null : current)), 1200);
    } catch {
      publishNotification({
        level: "error",
        title: "Copy Failed",
        message: "Unable to copy replay command from this browser context.",
      });
    }
  }

  return (
    <div className="space-y-4">
      {demoMode ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Demo mode (Supabase not configured)
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <label className="text-sm md:col-span-2">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Global Search</div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, canonical, purpose, id, tags, version, status, side-effects"
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
              <option key={option} value={option}>{option}</option>
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
            {effectOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Tag Contains</div>
          <input
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            placeholder="dynamic, replay..."
            className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>

        {owners.length > 0 ? (
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Owner</div>
            <select
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value as "all" | Owner)}
              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="all">all</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>{owner}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-300">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyDynamic}
            onChange={(event) => setOnlyDynamic(event.target.checked)}
          />
          Only dynamic
        </label>
        <span>{filteredRows.length} of {allCats.length} catalog items</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-800">
        <table className="min-w-[1450px] w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
            <tr>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("name")} className="font-semibold">Name {sortIndicator("name")}</button>
              </th>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("canonical_name")} className="font-semibold">Canonical {sortIndicator("canonical_name")}</button>
              </th>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("cat_id")} className="font-semibold">ID {sortIndicator("cat_id")}</button>
              </th>
              <th className="p-2">Purpose</th>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("version")} className="font-semibold">Version {sortIndicator("version")}</button>
              </th>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("status")} className="font-semibold">Status {sortIndicator("status")}</button>
              </th>
              <th className="p-2">Side-effects</th>
              <th className="p-2">Passport</th>
              <th className="p-2">Approval</th>
              <th className="p-2">Tags</th>
              <th className="p-2">
                <button type="button" onClick={() => toggleSort("last_updated")} className="font-semibold">Last Updated {sortIndicator("last_updated")}</button>
              </th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-4 text-sm text-gray-600 dark:text-gray-300">No results match filters</td>
              </tr>
            ) : (
              pagedRows.map((item) => (
                <tr key={item.cat_id} className="border-t border-gray-200 align-top dark:border-neutral-800">
                  <td className="p-2 font-medium">
                    <div className="flex items-center gap-2">
                      <span>{item.name}</span>
                      {item.tags.includes("dynamic") ? (
                        <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">Dynamic</span>
                      ) : null}
                    </div>
                  </td>
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
                        type="button"
                        onClick={() => setJsonItem(item)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        View JSON
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyReplayCommand(item)}
                        className="rounded border border-sky-300 px-2 py-1 text-xs text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-200 dark:hover:bg-sky-950/30"
                      >
                        {copiedCatId === item.cat_id ? "Copied" : "Copy Replay"}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadJson(`${item.cat_id}.json`, item)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        Download JSON
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          Showing {range.start}-{range.end} of {sortedRows.length}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <span>Page size</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded border border-gray-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setPage(1)} disabled={page <= 1} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700">First</button>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700">Prev</button>
          <span>Page {page} / {pageCount}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700">Next</button>
          <button type="button" onClick={() => setPage(pageCount)} disabled={page >= pageCount} className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700">Last</button>
        </div>
      </div>

      {jsonItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-xl border border-gray-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">{jsonItem.name} JSON</h3>
              <button
                type="button"
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
