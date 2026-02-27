"use client";

import { useEffect, useMemo, useState } from "react";

import { CatLibraryRow, getCatsLibraryRows } from "@/lib/cats-api";
import { buildEvidenceLocateCommand, buildWorkflowReplayCommands } from "@/lib/cats-replay";

type ValidationResult = {
  errors: string[];
  warnings: string[];
  sideEffectsUnion: string[];
};

type WorkflowArtifact = {
  artifact_type: "cats_workflow_simulation_plan";
  generated_at_utc: string;
  workflow: Array<{
    order: number;
    cat_id: string;
    canonical_name: string;
    type: string;
  }>;
  validation: ValidationResult;
  replay_commands_pwsh: string[];
  evidence_lookup_commands_pwsh: string[];
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

function validateWorkflow(rows: CatLibraryRow[]): ValidationResult {
  const now = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  const sideEffects = new Set<string>();

  rows.forEach((row, index) => {
    const catId = row.registryEntry.cat_id || row.definition?.cat_id || `step-${index + 1}`;
    const effects = row.definition?.allowed_side_effects || [];
    effects.forEach((effect) => sideEffects.add(effect));

    const passportRequired = Boolean(row.registryEntry.passport_required ?? row.definition?.passport_required);
    if (passportRequired && !row.passport) {
      errors.push(`${catId}: passport is required but unavailable.`);
    }
    if (row.passport?.expires_at_utc) {
      const expires = Date.parse(row.passport.expires_at_utc);
      if (!Number.isNaN(expires) && expires <= now) {
        errors.push(`${catId}: passport is expired (${row.passport.expires_at_utc}).`);
      }
    }
  });

  const firstType = rows[0]?.definition?.type;
  const hasNonGovernance = rows.some((row) => row.definition?.type && row.definition.type !== "governance");
  if (hasNonGovernance && firstType !== "governance") {
    errors.push("type constraint: first step must be governance when workflow includes non-governance CATS.");
  }

  const list = rows.map((row) => row.definition?.allowed_side_effects || []);
  const hasNone = list.some((effects) => effects.includes("none"));
  const hasWrite = list.some(
    (effects) => effects.includes("ledger_write") || effects.includes("workflow_dispatch")
  );
  if (hasNone && hasWrite) {
    errors.push("side-effects constraint: cannot mix 'none' with write/dispatch side effects in one workflow.");
  }

  const dispatchStep = rows.findIndex((row) =>
    (row.definition?.allowed_side_effects || []).includes("workflow_dispatch")
  );
  if (dispatchStep >= 0 && dispatchStep !== rows.length - 1) {
    errors.push("side-effects constraint: workflow_dispatch step must be the final step.");
  }

  if (rows.length < 2) {
    warnings.push("MVP builder works with one CAT, but workflow demo is stronger with 2+ CATS.");
  }

  return { errors, warnings, sideEffectsUnion: Array.from(sideEffects).sort() };
}

export default function WorkflowBuilder() {
  const [rows, setRows] = useState<CatLibraryRow[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<WorkflowArtifact | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCatsLibraryRows();
        setRows(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load CATS for workflow builder.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const byCatId = useMemo(() => {
    const map = new Map<string, CatLibraryRow>();
    rows.forEach((row) => {
      const catId = row.registryEntry.cat_id || row.definition?.cat_id;
      if (catId) map.set(catId, row);
    });
    return map;
  }, [rows]);

  const selectedRows = useMemo(
    () => selectedCatIds.map((catId) => byCatId.get(catId)).filter(Boolean) as CatLibraryRow[],
    [byCatId, selectedCatIds]
  );

  const validation = useMemo(() => validateWorkflow(selectedRows), [selectedRows]);

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

  function simulate() {
    const replayCommands = buildWorkflowReplayCommands(selectedCatIds);
    const locateCommands = selectedCatIds.map((catId) => buildEvidenceLocateCommand(catId));
    const nextArtifact: WorkflowArtifact = {
      artifact_type: "cats_workflow_simulation_plan",
      generated_at_utc: new Date().toISOString(),
      workflow: selectedRows.map((row, index) => ({
        order: index + 1,
        cat_id: row.registryEntry.cat_id || row.definition?.cat_id || `step-${index + 1}`,
        canonical_name: row.canonicalName,
        type: row.definition?.type || "unknown",
      })),
      validation,
      replay_commands_pwsh: replayCommands,
      evidence_lookup_commands_pwsh: locateCommands,
    };
    setArtifact(nextArtifact);
  }

  if (loading) {
    return <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-neutral-800">Loading CATS for workflow builder...</div>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Replay HTTP is not exposed by core-api; simulate mode generates exact <code>pwsh</code> commands for demo replay and evidence lookup.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Available CATS</h2>
          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const catId = row.registryEntry.cat_id || row.definition?.cat_id || "unknown";
              return (
                <div key={row.canonicalName} className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-neutral-700">
                  <div>
                    <div className="text-sm font-medium">{catId}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{row.canonicalName}</div>
                  </div>
                  <button
                    onClick={() => addCat(catId)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Workflow Steps</h2>
          <div className="mt-3 space-y-2">
            {selectedRows.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">Add CATs from the left panel.</div>
            ) : (
              selectedRows.map((row, index) => {
                const catId = row.registryEntry.cat_id || row.definition?.cat_id || `step-${index + 1}`;
                return (
                  <div key={`${catId}-${index}`} className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-neutral-700">
                    <div>
                      <div className="text-sm font-medium">{index + 1}. {catId}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        type={row.definition?.type || "unknown"} | effects={(row.definition?.allowed_side_effects || []).join(", ") || "-"}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => move(catId, -1)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700">Up</button>
                      <button onClick={() => move(catId, 1)} className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700">Down</button>
                      <button onClick={() => removeCat(catId)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300">Remove</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Compatibility Validation</h2>
        <div className="mt-2 text-sm">side-effects union: {(validation.sideEffectsUnion || []).join(", ") || "-"}</div>
        {validation.errors.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-red-700 dark:text-red-300">
            {validation.errors.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-sm text-green-700 dark:text-green-300">No blocking validation errors.</div>
        )}
        {validation.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
            {validation.warnings.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={simulate}
          disabled={selectedRows.length === 0 || validation.errors.length > 0}
          className="rounded bg-black px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Simulate (generate replay command pack)
        </button>
        {artifact && (
          <button
            onClick={() => downloadJson("cats-workflow-simulation-artifact.json", artifact)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Download Combined Artifact
          </button>
        )}
      </div>

      {artifact && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/70 dark:bg-sky-950/30">
          <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100">pwsh replay commands</h3>
          <pre className="mt-2 overflow-x-auto rounded border border-sky-200 bg-white p-2 text-[11px] dark:border-sky-900 dark:bg-neutral-950">
            {artifact.replay_commands_pwsh.join("\n")}
          </pre>
          <h3 className="mt-3 text-sm font-semibold text-sky-900 dark:text-sky-100">Evidence lookup commands</h3>
          <pre className="mt-2 overflow-x-auto rounded border border-sky-200 bg-white p-2 text-[11px] dark:border-sky-900 dark:bg-neutral-950">
            {artifact.evidence_lookup_commands_pwsh.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
