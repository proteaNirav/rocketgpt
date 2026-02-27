"use client";

import { useMemo, useState } from "react";

import { CatCatalogItem, SEED_CATS } from "@/lib/cats-seed";
import { isDemoMode } from "@/lib/demo-mode";

type WorkflowArtifact = {
  artifact_type: "cats_workflow_mvp";
  generated_at_utc: string;
  workflow: Array<{
    order: number;
    cat_id: string;
    canonical_name: string;
    name: string;
  }>;
  side_effects_summary: {
    union: Array<"none" | "read_only" | "ledger_write" | "workflow_dispatch">;
    includes_workflow_dispatch: boolean;
  };
};

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function WorkflowBuilder() {
  const [paletteQuery, setPaletteQuery] = useState("");
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);

  const demoMode = isDemoMode();

  const byId = useMemo(() => {
    const map = new Map<string, CatCatalogItem>();
    for (const item of SEED_CATS) map.set(item.cat_id, item);
    return map;
  }, []);

  const palette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    const filtered = SEED_CATS.filter((item) => {
      if (!q) return true;
      const haystack = [item.name, item.canonical_name, item.purpose, item.tags.join(" ")].join(" ").toLowerCase();
      return haystack.includes(q);
    });
    return filtered.slice(0, 100);
  }, [paletteQuery]);

  const selected = useMemo(
    () => selectedCatIds.map((catId) => byId.get(catId)).filter(Boolean) as CatCatalogItem[],
    [byId, selectedCatIds]
  );

  const sideEffectsUnion = useMemo(() => {
    const values = new Set<CatCatalogItem["allowed_side_effects"][number]>();
    selected.forEach((item) => item.allowed_side_effects.forEach((effect) => values.add(effect)));
    return Array.from(values).sort();
  }, [selected]);

  const requiresElevatedGovernance = sideEffectsUnion.includes("workflow_dispatch");

  function addCat(catId: string) {
    setSelectedCatIds((current) => (current.includes(catId) ? current : [...current, catId]));
  }

  function removeCat(catId: string) {
    setSelectedCatIds((current) => current.filter((id) => id !== catId));
  }

  function move(catId: string, direction: -1 | 1) {
    setSelectedCatIds((current) => {
      const index = current.indexOf(catId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function exportWorkflowArtifact() {
    const artifact: WorkflowArtifact = {
      artifact_type: "cats_workflow_mvp",
      generated_at_utc: new Date().toISOString(),
      workflow: selected.map((item, index) => ({
        order: index + 1,
        cat_id: item.cat_id,
        canonical_name: item.canonical_name,
        name: item.name,
      })),
      side_effects_summary: {
        union: sideEffectsUnion,
        includes_workflow_dispatch: requiresElevatedGovernance,
      },
    };

    downloadJson("cats-workflow-mvp-artifact.json", artifact);
  }

  return (
    <div className="space-y-4">
      {demoMode ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Demo mode (Supabase not configured) — showing seed catalog
        </div>
      ) : null}

      {requiresElevatedGovernance ? (
        <div className="inline-flex rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          Requires elevated governance
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Seed CAT Palette</h2>
          <label className="mt-3 block text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">Search seed catalog</div>
            <input
              value={paletteQuery}
              onChange={(event) => setPaletteQuery(event.target.value)}
              placeholder="Search name, canonical, purpose, tags"
              className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-auto pr-1">
            {palette.map((item) => (
              <div key={item.cat_id} className="rounded border border-gray-200 p-2 dark:border-neutral-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">{item.cat_id}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{item.canonical_name}</div>
                  </div>
                  <button
                    onClick={() => addCat(item.cat_id)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Ordered Workflow (MVP)</h2>
          <div className="mt-3 space-y-2">
            {selected.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">Add CATs from the left panel.</div>
            ) : (
              selected.map((item, index) => (
                <div key={`${item.cat_id}-${index}`} className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-neutral-700">
                  <div>
                    <div className="text-sm font-medium">{index + 1}. {item.name}</div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">{item.cat_id}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{item.canonical_name}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => move(item.cat_id, -1)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700">Up</button>
                    <button onClick={() => move(item.cat_id, 1)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700">Down</button>
                    <button onClick={() => removeCat(item.cat_id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
            <div>Selected CATs: {selected.length}</div>
            <div className="mt-1">Combined side-effects: {sideEffectsUnion.join(", ") || "-"}</div>
          </div>

          <button
            onClick={exportWorkflowArtifact}
            disabled={selected.length === 0}
            className="mt-3 rounded bg-black px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Download workflow artifact JSON
          </button>
        </div>
      </div>
    </div>
  );
}
