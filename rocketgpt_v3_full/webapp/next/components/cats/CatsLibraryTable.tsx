"use client";

import { useEffect, useMemo, useState } from "react";

import { CatLibraryRow, getCatsLibraryRows } from "@/lib/cats-api";
import { buildEvidenceLocateCommand, buildReplayCommand } from "@/lib/cats-replay";

type ReplaySelection = {
  catId: string;
  mode: "normal" | "expired";
};

function JsonPanel({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        {title}
      </h4>
      <pre className="overflow-x-auto text-[11px] leading-5 text-gray-800 dark:text-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function ReplayCommands({ catId, mode }: ReplaySelection) {
  const replay = buildReplayCommand(catId, mode === "expired" ? "expired" : undefined);
  const locate = buildEvidenceLocateCommand(catId);

  return (
    <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/70 dark:bg-sky-950/40">
      <div className="text-xs font-semibold text-sky-800 dark:text-sky-200">
        Demo Replay Command ({mode === "expired" ? "forced denial: expired" : "normal"})
      </div>
      <pre className="overflow-x-auto rounded border border-sky-200 bg-white p-2 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-neutral-950 dark:text-sky-100">
        {replay}
      </pre>
      <div className="text-xs font-semibold text-sky-800 dark:text-sky-200">Locate latest evidence artifact</div>
      <pre className="overflow-x-auto rounded border border-sky-200 bg-white p-2 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-neutral-950 dark:text-sky-100">
        {locate}
      </pre>
    </div>
  );
}

export default function CatsLibraryTable() {
  const [rows, setRows] = useState<CatLibraryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDefinition, setOpenDefinition] = useState<string | null>(null);
  const [openPassport, setOpenPassport] = useState<string | null>(null);
  const [replaySelection, setReplaySelection] = useState<ReplaySelection | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCatsLibraryRows();
      setRows(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load CATS library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const left = a.registryEntry.cat_id || "";
        const right = b.registryEntry.cat_id || "";
        return left.localeCompare(right);
      }),
    [rows]
  );

  if (loading) {
    return <div className="rounded-lg border border-gray-200 p-4 text-sm dark:border-neutral-800">Loading CATS registry...</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
        <button
          onClick={() => void load()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Read-only source: <code>/api/core/cats/*</code> proxy to core-api.
        </p>
        <button
          onClick={() => void load()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-800">
        <table className="min-w-[1300px] w-full text-left text-sm">
          <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
            <tr>
              <th className="p-2">canonical_name</th>
              <th className="p-2">cat_id</th>
              <th className="p-2">type</th>
              <th className="p-2">status</th>
              <th className="p-2">passport_required</th>
              <th className="p-2">issuer</th>
              <th className="p-2">expires_at_utc</th>
              <th className="p-2">allowed_side_effects</th>
              <th className="p-2">tags</th>
              <th className="p-2">entrypoint</th>
              <th className="p-2">version</th>
              <th className="p-2">actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const catId = row.registryEntry.cat_id || row.definition?.cat_id || row.canonicalName;
              const isDefinitionOpen = openDefinition === catId;
              const isPassportOpen = openPassport === catId;
              const isReplayOpen = replaySelection?.catId === catId;

              return (
                <tr key={row.canonicalName} className="border-t border-gray-200 align-top dark:border-neutral-800">
                  <td className="p-2 font-medium">{row.canonicalName}</td>
                  <td className="p-2">{catId}</td>
                  <td className="p-2">{row.definition?.type || "-"}</td>
                  <td className="p-2">{row.registryEntry.status || "-"}</td>
                  <td className="p-2">{String(row.registryEntry.passport_required ?? row.definition?.passport_required ?? false)}</td>
                  <td className="p-2">{row.registryEntry.issuer || row.passport?.issuer || "-"}</td>
                  <td className="p-2">{row.passport?.expires_at_utc || row.passportError || "-"}</td>
                  <td className="p-2">{(row.definition?.allowed_side_effects || []).join(", ") || "-"}</td>
                  <td className="p-2">{(row.definition?.tags || []).join(", ") || "-"}</td>
                  <td className="p-2">{row.definition?.entrypoint || "-"}</td>
                  <td className="p-2">{row.definition?.version || "-"}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setOpenDefinition(isDefinitionOpen ? null : catId)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        View Definition
                      </button>
                      <button
                        onClick={() => setOpenPassport(isPassportOpen ? null : catId)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        View Passport
                      </button>
                      <button
                        onClick={() =>
                          setReplaySelection(
                            isReplayOpen && replaySelection?.mode === "normal"
                              ? null
                              : { catId, mode: "normal" }
                          )
                        }
                        className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                      >
                        Run Demo Replay (normal)
                      </button>
                      <button
                        onClick={() =>
                          setReplaySelection(
                            isReplayOpen && replaySelection?.mode === "expired"
                              ? null
                              : { catId, mode: "expired" }
                          )
                        }
                        className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
                      >
                        Run Demo Replay (forced denial: expired)
                      </button>
                    </div>

                    {isDefinitionOpen && (
                      <div className="mt-2">
                        {row.definition ? (
                          <JsonPanel title="Definition" data={row.definition} />
                        ) : (
                          <div className="text-xs text-red-600 dark:text-red-300">{row.definitionError || "Definition unavailable."}</div>
                        )}
                      </div>
                    )}

                    {isPassportOpen && (
                      <div className="mt-2">
                        {row.passport ? (
                          <JsonPanel title="Passport" data={row.passport} />
                        ) : (
                          <div className="text-xs text-red-600 dark:text-red-300">{row.passportError || "Passport unavailable."}</div>
                        )}
                      </div>
                    )}

                    {isReplayOpen && replaySelection && (
                      <div className="mt-2">
                        <ReplayCommands catId={catId} mode={replaySelection.mode} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
