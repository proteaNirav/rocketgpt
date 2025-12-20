"use client";

import React, { useState } from "react";

type TesterResult = {
  test_case: string;
  status: string;
  error: string | null;
  duration_ms: number;
};

type TesterPayload = {
  test_run_id: string;
  status: string;
  summary: string;
  results: TesterResult[];
  logs: string[];
  artifacts: unknown[];
};

type BuilderPayload = {
  success: boolean;
  message?: string;
  tester?: TesterPayload;
};

type OrchestratorResponse = {
  success: boolean;
  message?: string;
  builder?: BuilderPayload;
  error?: string;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const isSuccess =
    normalized === "success" ||
    normalized === "passed" ||
    normalized === "ok" ||
    normalized === "true";

  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " +
        (isSuccess
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-destructive/10 text-destructive")
      }
    >
      {status}
    </span>
  );
}

export default function OrchestratorTesterConsole() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPipeline() {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/orchestrator/builder/execute-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `HTTP ${res.status} ${res.statusText} → ${text.substring(0, 300)}`
        );
      }

      const json = (await res.json()) as OrchestratorResponse;
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? "Unknown error while calling orchestrator.");
    } finally {
      setLoading(false);
    }
  }

  const tester = data?.builder?.tester;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Orchestrator → Tester Console
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Execute the orchestrator pipeline and inspect tester output,
              results, and logs.
            </p>
          </div>

          <button
            type="button"
            onClick={runPipeline}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running…" : "Run Orchestrator → Tester"}
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow">
            <div className="mb-1 font-semibold">Error</div>
            <div className="whitespace-pre-wrap text-xs">{error}</div>
          </div>
        )}

        {/* INITIAL EMPTY STATE – plain centered hint, no card/pill */}
        {!data && !error && !loading && (
          <p className="pt-4 text-center text-sm text-muted-foreground">
            Click{" "}
            <span className="font-semibold">Run Orchestrator → Tester</span> to
            execute the pipeline and see results here.
          </p>
        )}

        {/* RESULTS */}
        {data && (
          <div className="space-y-6">
            {/* STATUS CARDS */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-6 text-sm shadow-sm">
                <h3 className="mb-2 text-sm font-semibold">
                  Orchestrator Status
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Success:</span>
                    <StatusBadge status={String(data.success)} />
                  </div>
                  {data.message && (
                    <div className="text-muted-foreground">{data.message}</div>
                  )}
                  {data.builder?.message && (
                    <div className="text-muted-foreground">
                      {data.builder.message}
                    </div>
                  )}
                </div>
              </div>

              {tester && (
                <div className="rounded-xl border bg-card p-6 text-sm shadow-sm">
                  <h3 className="mb-2 text-sm font-semibold">Tester Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-medium">Run ID:</span>{" "}
                      <span className="font-mono text-xs">
                        {tester.test_run_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <StatusBadge status={tester.status} />
                    </div>
                    <div className="text-muted-foreground">
                      {tester.summary}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RESULTS + LOGS */}
            {tester && (
              <div className="grid gap-6 lg:grid-cols-2">
                {/* TEST RESULTS */}
                <div className="rounded-xl border bg-card p-6 text-sm shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">Test Results</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Test Case</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tester.results.map((r, idx) => (
                          <tr
                            key={idx}
                            className="border-b last:border-none text-sm"
                          >
                            <td className="px-3 py-2 font-mono text-xs">
                              {r.test_case}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-3 py-2">{r.duration_ms} ms</td>
                            <td className="px-3 py-2 text-xs text-destructive">
                              {r.error ?? ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* LOGS */}
                <div className="rounded-xl border bg-card p-6 text-sm shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold">Logs</h3>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-xs font-mono text-muted-foreground">
                    {tester.logs.join("\n")}
                  </pre>
                </div>
              </div>
            )}

            {/* NO TESTER DATA (edge case) */}
            {!tester && !error && (
              <p className="pt-2 text-center text-sm text-muted-foreground">
                No tester data yet. Click{" "}
                <span className="font-semibold">
                  Run Orchestrator → Tester
                </span>{" "}
                to execute the pipeline and view results.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
