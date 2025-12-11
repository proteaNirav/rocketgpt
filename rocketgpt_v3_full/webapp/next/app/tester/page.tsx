"use client";

import React, { useState } from "react";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type AnyRecord = Record<string, any>;

type TestRow = {
  name: string;
  ok: boolean | null;
  duration: number | null;
};

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === true) {
    return (
      <span className="inline-flex items-center gap-1 text-green-400 text-sm">
        <CheckCircle size={16} /> PASS
      </span>
    );
  }
  if (ok === false) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-sm">
        <XCircle size={16} /> FAIL
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-yellow-400 text-sm">
      <AlertTriangle size={16} /> UNKNOWN
    </span>
  );
}

/**
 * Build test rows from a tester-style response:
 *   { profile, http, engine{ tests[], logs, duration_ms, success }, ... }
 * Works for both direct tester response and orchResponse.builder.tester.
 */
function buildTestRowsFromTester(tester: AnyRecord | null): TestRow[] {
  if (!tester) return [];

  const engine = tester.engine || {};
  const http = tester.http || {};

  // If engine.tests array exists -> multi-test mode
  if (Array.isArray(engine.tests) && engine.tests.length > 0) {
    return engine.tests.map((t: AnyRecord, idx: number) => {
      const status = (t.status || t.result || "").toString().toLowerCase();
      let ok: boolean | null = null;
      if (["passed", "pass", "success"].includes(status)) ok = true;
      else if (["failed", "fail", "error"].includes(status)) ok = false;

      const duration =
        typeof t.duration_ms === "number"
          ? t.duration_ms
          : typeof t.duration === "number"
          ? t.duration
          : null;

      const name =
        t.test_case ||
        t.name ||
        (t.id ? `Test #${idx + 1} (${t.id})` : `Test #${idx + 1}`);

      return { name, ok, duration };
    });
  }

  // Fallback synthetic row from HTTP + engine
  const name =
    http.status_code && http.category
      ? `HTTP ${http.status_code} (${http.category})`
      : "HTTP status evaluation";

  const ok =
    engine.success ??
    tester.success ??
    (http.result === "match" ? true : null);

  const duration =
    typeof engine.duration_ms === "number" ? engine.duration_ms : null;

  return [{ name, ok, duration }];
}

/**
 * Derive OK flag from tester-style object.
 */
function deriveTesterOk(tester: AnyRecord | null): boolean | null {
  if (!tester) return null;
  const engine = tester.engine || {};
  const http = tester.http || {};
  if (typeof tester.success === "boolean") return tester.success;
  if (typeof engine.success === "boolean") return engine.success;
  if (http.result === "match") return true;
  return null;
}

/**
 * Derive logs from tester-style object.
 */
function deriveTesterLogs(tester: AnyRecord | null): string[] {
  if (!tester) return [];
  const engine = tester.engine || {};
  if (Array.isArray(engine.logs)) return engine.logs;
  if (Array.isArray(tester.logs)) return tester.logs;
  return [];
}

/**
 * Derive artifacts from tester-style object.
 */
function deriveTesterArtifacts(tester: AnyRecord | null): any[] {
  if (!tester) return [];
  const engine = tester.engine || {};
  if (Array.isArray(engine.artifacts)) return engine.artifacts;
  if (Array.isArray(tester.artifacts)) return tester.artifacts;
  return [];
}

/**
 * Derive total test count from tester-style object + rows.
 */
function deriveTesterTotalCases(
  tester: AnyRecord | null,
  rows: TestRow[]
): number {
  if (!tester) return rows.length;
  if (typeof tester.tests_executed === "number") return tester.tests_executed;
  if (typeof tester.engine?.tests_executed === "number") {
    return tester.engine.tests_executed;
  }
  return rows.length;
}

export default function TesterPage() {
  // Direct tester state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directResp, setDirectResp] = useState<AnyRecord | null>(null);

  // Orchestrator pipeline state
  const [orchLoading, setOrchLoading] = useState(false);
  const [orchError, setOrchError] = useState<string | null>(null);
  const [orchResp, setOrchResp] = useState<AnyRecord | null>(null);

  async function runTester() {
    setLoading(true);
    setError(null);
    setDirectResp(null);

    try {
      const res = await fetch("/api/tester/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: "base",
          goal: "Orchestrator \u2192 Tester HTTP status + profile test",
          runId: "orch-tester-ui",
        }),
      });

      const data = await res.json();
      setDirectResp(data);
    } catch (err: any) {
      setError(err?.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function runOrchestratorPipeline() {
    setOrchLoading(true);
    setOrchError(null);
    setOrchResp(null);

    try {
      const res = await fetch("/api/orchestrator/builder/execute-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      setOrchResp(data);
    } catch (err: any) {
      setOrchError(err?.message || "Unexpected error while running pipeline.");
    } finally {
      setOrchLoading(false);
    }
  }

  // ---------- Direct tester derived data ----------
  const directTester = directResp; // already in tester-style shape
  const directProfile = directTester?.profile || null;
  const directHttp = directTester?.http || null;

  const directRows = buildTestRowsFromTester(directTester);
  const directOk = deriveTesterOk(directTester);
  const directLogs = deriveTesterLogs(directTester);
  const directArtifacts = deriveTesterArtifacts(directTester);
  const directTotal = deriveTesterTotalCases(directTester, directRows);

  // ---------- Orchestrator pipeline derived data ----------
  const orchTester: AnyRecord | null =
    (orchResp?.builder as AnyRecord | undefined)?.tester || null;

  const orchOk =
    (typeof orchResp?.success === "boolean" && orchResp.success) ||
    (typeof (orchResp?.builder as AnyRecord | undefined)?.success ===
      "boolean" &&
      (orchResp!.builder as AnyRecord).success) ||
    deriveTesterOk(orchTester);

  const orchTesterOk = deriveTesterOk(orchTester);
  const orchTesterRows = buildTestRowsFromTester(orchTester);
  const orchTesterTotal = deriveTesterTotalCases(orchTester, orchTesterRows);
  const orchTesterLogs = deriveTesterLogs(orchTester);
  const orchTesterArtifacts = deriveTesterArtifacts(orchTester);

  return (
    <div className="p-6 space-y-8">
      {/* ===================== DIRECT TESTER ===================== */}
      <div className="rounded-xl border border-gray-800 p-6 bg-black/30">
        <h2 className="text-xl font-semibold mb-4">Tester Runner</h2>

        {error && (
          <div className="border border-red-600 text-red-400 p-3 rounded-md mb-4 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <button
          onClick={runTester}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-white inline-flex items-center gap-2 text-sm"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          Run Tests
        </button>
      </div>

      {directTester && (
        <div className="rounded-xl border border-gray-800 p-6 bg-black/20 space-y-6">
          <h3 className="text-lg font-semibold">Results</h3>

          {/* Top Summary Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Summary Card */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">
                  Overall
                </span>
                <StatusBadge ok={directOk} />
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Tests executed:</span>{" "}
                {directTotal}
              </p>
              {typeof directTester?.engine?.tests_passed === "number" && (
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Passed:</span>{" "}
                  {directTester.engine.tests_passed} &nbsp;|&nbsp;
                  <span className="font-semibold">Failed:</span>{" "}
                  {directTester.engine.tests_failed}
                </p>
              )}
              {typeof directTester?.engine?.duration_ms === "number" && (
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Duration:</span>{" "}
                  {directTester.engine.duration_ms} ms
                </p>
              )}
              {directTester.summary && (
                <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">
                  {directTester.summary}
                </p>
              )}
            </div>

            {/* Profile Card */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">
                  Profile
                </span>
                <span className="text-xs rounded-full border border-gray-600 px-2 py-0.5 uppercase tracking-wide text-gray-300">
                  {directProfile?.id ?? "base"}
                </span>
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Label:</span>{" "}
                {directProfile?.label ?? "Base Smoke"}
              </p>
              {directProfile && (
                <>
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold">Strictness:</span>{" "}
                    {directProfile.strictness}
                  </p>
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold">Depth:</span>{" "}
                    {directProfile.depth}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Max cases: {directProfile.maxTestCases} &nbsp;|&nbsp; Max
                    duration: {directProfile.maxDurationMs} ms &nbsp;|&nbsp;
                    Parallelism: {directProfile.parallelism}
                  </p>
                </>
              )}
            </div>

            {/* HTTP Evaluation Card */}
            <div className="border rounded-lg p-4 bg-black/30 border-gray-700 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-200">
                  HTTP Evaluation
                </span>
                <StatusBadge
                  ok={directHttp?.result === "match" ? true : null}
                />
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Status Code:</span>{" "}
                {directHttp?.status_code ?? "-"}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Category:</span>{" "}
                {directHttp?.category ?? "-"}
              </p>
              {directHttp?.message && (
                <p className="text-xs text-gray-400 mt-2 whitespace-pre-line">
                  {directHttp.message}
                </p>
              )}
            </div>
          </div>

          {/* Test Rows Table */}
          {directRows.length > 0 && (
            <div className="overflow-x-auto border border-gray-700 rounded-lg">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-900/60">
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      Test Case
                    </th>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      Status
                    </th>
                    <th className="border border-gray-700 px-3 py-2 text-left">
                      Duration (ms)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {directRows.map((row, idx) => (
                    <tr key={idx} className="bg-black/40 hover:bg-black/60">
                      <td className="border border-gray-800 px-3 py-2">
                        {row.name}
                      </td>
                      <td className="border border-gray-800 px-3 py-2">
                        <StatusBadge ok={row.ok} />
                      </td>
                      <td className="border border-gray-800 px-3 py-2">
                        {row.duration ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Logs Panel */}
          <div className="border border-gray-700 rounded-lg p-4 bg-black/40">
            <h4 className="font-medium mb-2 text-sm">Logs</h4>
            <div className="max-h-48 overflow-y-auto text-gray-400 whitespace-pre-wrap bg-black/30 p-3 rounded-md text-xs">
              {directLogs.length > 0
                ? directLogs.join("\n")
                : "No logs returned."}
            </div>
          </div>

          {/* Artifacts Panel */}
          <div className="border border-gray-700 rounded-lg p-4 bg-black/40">
            <h4 className="font-medium mb-2 text-sm">Artifacts</h4>
            {directArtifacts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {directArtifacts.map((a, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-gray-700 bg-black/30 p-3"
                  >
                    <p className="text-xs text-gray-300 font-semibold mb-2">
                      {a.name || "artifact"}
                    </p>
                    {a.type &&
                    typeof a.type === "string" &&
                    a.type.startsWith("image/") ? (
                      <img
                        src={a.url}
                        alt={a.name || "artifact"}
                        className="rounded-md border border-gray-800 mb-3"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs mb-3">
                        ({a.type || "file"})
                      </div>
                    )}
                    <a
                      href={a.url}
                      target="_blank"
                      className="text-blue-400 text-xs hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-xs">
                No artifacts generated.
              </div>
            )}
          </div>

          {/* Debug Panels */}
          <div className="space-y-4 mt-6 border-t border-gray-800 pt-6">
            <details className="border border-gray-800 rounded-lg bg-black/20">
              <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-black/30">
                Request Payload (Direct Tester)
              </summary>
              <pre className="p-4 text-xs whitespace-pre-wrap overflow-x-auto text-gray-300 bg-black/30 border-t border-gray-800">
{JSON.stringify({
  profile: "base",
  goal: "Orchestrator → Tester HTTP status + profile test",
  runId: "orch-tester-ui"
}, null, 2)}
              </pre>
            </details>

            <details className="border border-gray-800 rounded-lg bg-black/20">
              <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-black/30">
                Full API Response (Direct Tester)
              </summary>
              <pre className="p-4 text-xs whitespace-pre-wrap overflow-x-auto text-gray-300 bg-black/30 border-t border-gray-800">
{directResp ? JSON.stringify(directResp, null, 2) : "No response yet."}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* ===================== ORCHESTRATOR PIPELINE ===================== */}
      <div className="rounded-xl border border-gray-800 p-6 bg-black/30">
        <h2 className="text-xl font-semibold mb-4">
          Orchestrator → Builder → Tester Pipeline
        </h2>

        {orchError && (
          <div className="border border-red-600 text-red-400 p-3 rounded-md mb-4 text-sm">
            <strong>Error:</strong> {orchError}
          </div>
        )}

        <button
          onClick={runOrchestratorPipeline}
          disabled={orchLoading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 rounded-lg text-white inline-flex items-center gap-2 text-sm"
        >
          {orchLoading && <Loader2 className="animate-spin" size={18} />}
          Run Orchestrator Pipeline
        </button>

        {orchResp && (
          <div className="mt-6 space-y-4">
            {/* Pipeline Summary */}
            <div className="border border-gray-700 rounded-lg p-4 bg-black/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-200">
                  Pipeline Summary
                </span>
                <StatusBadge ok={orchOk ? true : null} />
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold">Message:</span>{" "}
                {orchResp.message || "(no message)"}
              </p>
              {orchResp.runId && (
                <p className="text-xs text-gray-400 mt-1">
                  Run ID: {orchResp.runId}
                </p>
              )}
            </div>

            {/* Tester Summary from pipeline */}
            {orchTester && (
              <div className="border border-gray-700 rounded-lg p-4 bg-black/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-200">
                    Tester Summary (from pipeline)
                  </span>
                  <StatusBadge ok={orchTesterOk} />
                </div>
                <p className="text-sm text-gray-300">
                  <span className="font-semibold">Status:</span>{" "}
                  {orchTester.status ||
                    (orchTesterOk === true
                      ? "success"
                      : orchTesterOk === false
                      ? "failed"
                      : "-")}
                </p>
                {orchTester.summary && (
                  <p className="text-xs text-gray-400 whitespace-pre-line">
                    {orchTester.summary}
                  </p>
                )}

                {/* Tester test rows from pipeline */}
                {orchTesterRows.length > 0 && (
                  <div className="mt-3 overflow-x-auto border border-gray-700 rounded-lg">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-gray-900/60">
                        <tr>
                          <th className="border border-gray-700 px-3 py-2 text-left">
                            Test Case
                          </th>
                          <th className="border border-gray-700 px-3 py-2 text-left">
                            Status
                          </th>
                          <th className="border border-gray-700 px-3 py-2 text-left">
                            Duration (ms)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {orchTesterRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="bg-black/40 hover:bg-black/60"
                          >
                            <td className="border border-gray-800 px-3 py-2">
                              {row.name}
                            </td>
                            <td className="border border-gray-800 px-3 py-2">
                              <StatusBadge ok={row.ok} />
                            </td>
                            <td className="border border-gray-800 px-3 py-2">
                              {row.duration ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pipeline tester logs */}
                <div className="mt-3">
                  <h4 className="font-medium mb-1 text-sm">Tester Logs</h4>
                  <div className="max-h-40 overflow-y-auto text-gray-400 whitespace-pre-wrap bg-black/30 p-3 rounded-md text-xs border border-gray-700">
                    {orchTesterLogs.length > 0
                      ? orchTesterLogs.join("\n")
                      : "No tester logs returned from pipeline."}
                  </div>
                </div>

                {/* Pipeline tester artifacts */}
                <div className="mt-3">
                  <h4 className="font-medium mb-1 text-sm">Tester Artifacts</h4>
                  {orchTesterArtifacts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {orchTesterArtifacts.map((a, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-gray-700 bg-black/30 p-3"
                        >
                          <p className="text-xs text-gray-300 font-semibold mb-2">
                            {a.name || "artifact"}
                          </p>
                          {a.type &&
                          typeof a.type === "string" &&
                          a.type.startsWith("image/") ? (
                            <img
                              src={a.url}
                              alt={a.name || "artifact"}
                              className="rounded-md border border-gray-800 mb-3"
                            />
                          ) : (
                            <div className="text-gray-400 text-xs mb-3">
                              ({a.type || "file"})
                            </div>
                          )}
                          <a
                            href={a.url}
                            target="_blank"
                            className="text-blue-400 text-xs hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-xs">
                      No artifacts generated.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw JSON debug */}
            <details className="border border-gray-800 rounded-lg bg-black/20">
              <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-black/30">
                Full Pipeline Response (raw JSON)
              </summary>
              <pre className="p-4 text-xs whitespace-pre-wrap overflow-x-auto text-gray-300 bg-black/30 border-t border-gray-800">
{JSON.stringify(orchResp, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
