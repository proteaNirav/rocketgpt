"use client";

import { useEffect, useState } from "react";

type SelfImproveRun = {
  run_id: string | null;
  run_number: number | null;
  repository: string | null;
  sha: string | null;
  ref: string | null;
  phase: string | null;
  status: string | null;
  title: string | null;
  summary: string | null;
  created_at?: string | null;
};

export default function SelfImproveDashboard() {
  const [runs, setRuns] = useState<SelfImproveRun[]>([]);
  const [source, setSource] = useState<string>("unknown");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/self-improve/run");
        const data = await res.json();

        if (data.ok) {
          setRuns(data.runs ?? []);
          setSource(data.source ?? "unknown");
          setMessage(data.message ?? "");
        } else {
          setError("API returned an error");
        }
      } catch (err: any) {
        setError(err?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Self-Improve Status</h1>
        <p className="text-slate-400 mb-6">
          Visibility layer for RocketGPT v4 Core AI self-improvement loop.
        </p>

        {loading && (
          <div className="text-slate-400 text-sm">Loading latest runs...</div>
        )}

        {error && (
          <div className="text-red-400 text-sm">
            Failed to load status: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-sm text-slate-400 mb-4">
              Source: <span className="font-mono">{source}</span>{" "}
              {message && <>— {message}</>}
            </div>

            {runs.length === 0 ? (
              <div className="text-slate-400 text-sm">
                No runs available yet. Waiting for workflow emission.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900/80 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Phase</th>
                      <th className="px-3 py-2 text-left">Title</th>
                      <th className="px-3 py-2 text-left">SHA</th>
                      <th className="px-3 py-2 text-left">Run #</th>
                      <th className="px-3 py-2 text-left">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-800 hover:bg-slate-900/70"
                      >
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-700/60 text-slate-300 border border-slate-500/40"
                            }`}
                          >
                            {r.status ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-300">
                          {r.phase ?? "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.title ?? "-"}</div>
                          <div className="text-xs text-slate-400">
                            {r.summary ?? ""}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {r.sha ? r.sha.substring(0, 7) : "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-400">
                          {r.run_number ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
