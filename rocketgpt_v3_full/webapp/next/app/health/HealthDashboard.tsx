"use client";

import { useCallback, useEffect, useState } from "react";

export type OverallStatus = "healthy" | "degraded" | "down";

export type ModuleHealth = {
  ok: boolean;
  status: OverallStatus;
  latency_ms?: number;
  error?: string | null;
};

export type OrchestratorHealthResponse = {
  success: boolean;
  service: string;
  version: string;
  environment: string;
  safe_mode: {
    enabled: boolean;
    source: "env" | "config" | "stub";
    enforced_routes: string[];
  };
  summary: {
    overall_status: OverallStatus;
    healthy_modules: string[];
    degraded_modules: string[];
    down_modules: string[];
  };
  health: {
    planner: ModuleHealth;
    builder: ModuleHealth;
    tester: ModuleHealth;
    approvals: ModuleHealth;
  };
  timestamp: string;
};

type HealthDashboardProps = {
  initialData: OrchestratorHealthResponse | null;
};

function statusBadge(status: OverallStatus) {
  const baseClasses =
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border";

  switch (status) {
    case "healthy":
      return (
        <span className={baseClasses + " border-green-500 text-green-500"}>
          ● Healthy
        </span>
      );
    case "degraded":
      return (
        <span className={baseClasses + " border-yellow-500 text-yellow-500"}>
          ● Degraded
        </span>
      );
    case "down":
      return (
        <span className={baseClasses + " border-red-500 text-red-500"}>
          ● Down
        </span>
      );
    default:
      return (
        <span className={baseClasses + " border-gray-500 text-gray-500"}>
          ● Unknown
        </span>
      );
  }
}

export default function HealthDashboard({ initialData }: HealthDashboardProps) {
  const [data, setData] = useState<OrchestratorHealthResponse | null>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSec, setIntervalSec] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const res = await fetch("/api/orchestrator/health", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as OrchestratorHealthResponse;
      setData(json);
    } catch (err: unknown) {
      console.error("[/health] Auto-refresh error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh orchestrator health.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const id = setInterval(() => {
      void fetchLatest();
    }, intervalSec * 1000);

    return () => clearInterval(id);
  }, [autoRefresh, intervalSec, fetchLatest]);

  if (!data) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">RocketGPT Health</h1>
        <div className="border border-red-500/40 bg-red-500/5 rounded-lg p-4 text-sm text-red-500">
          Unable to load Orchestrator health. Please ensure the server is running
          and /api/orchestrator/health is reachable.
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchLatest()}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-500/60 hover:bg-gray-800"
          >
            Retry now
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-400">
            Last error: <span className="font-mono">{error}</span>
          </p>
        )}
      </div>
    );
  }

  const { summary, safe_mode, health } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RocketGPT Orchestrator Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Service: {data.service} · Version: {data.version} · Env:{" "}
            {data.environment}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5">
          <div className="flex items-center gap-2">
            {statusBadge(summary.overall_status)}
            {isRefreshing && (
              <span className="text-xs text-gray-400 animate-pulse">
                Refreshing…
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated at: {new Date(data.timestamp).toLocaleString()}
          </span>
        </div>
      </header>

      <section className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded border-gray-500/60"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <button
            type="button"
            onClick={() => void fetchLatest()}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-500/60 hover:bg-gray-800"
          >
            Refresh now
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Interval:</span>
          {[5, 10, 30].map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setIntervalSec(sec)}
              className={
                "px-2 py-1 rounded-lg border " +
                (intervalSec === sec
                  ? "border-green-500 text-green-400"
                  : "border-gray-600 text-gray-400")
              }
            >
              {sec}s
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Healthy modules</h2>
          <p className="text-sm text-green-600 dark:text-green-400">
            {summary.healthy_modules.length > 0
              ? summary.healthy_modules.join(", ")
              : "None"}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Degraded modules</h2>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {summary.degraded_modules.length > 0
              ? summary.degraded_modules.join(", ")
              : "None"}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Down modules</h2>
          <p className="text-sm text-red-600 dark:text-red-400">
            {summary.down_modules.length > 0
              ? summary.down_modules.join(", ")
              : "None"}
          </p>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40 space-y-2">
        <h2 className="text-sm font-medium">Safe-Mode</h2>
        <p className="text-sm">
          <span
            className={
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border " +
              (safe_mode.enabled
                ? "border-amber-500 text-amber-500"
                : "border-gray-400 text-gray-500")
            }
          >
            {safe_mode.enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Source: {safe_mode.source}
        </p>
        {safe_mode.enforced_routes?.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enforced routes: {safe_mode.enforced_routes.join(", ")}
          </p>
        )}
      </section>

      <section className="border rounded-xl p-4 bg-white dark:bg-gray-900/60">
        <h2 className="text-sm font-medium mb-3">Module details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-semibold">Module</th>
                <th className="text-left py-2 pr-4 font-semibold">Status</th>
                <th className="text-left py-2 pr-4 font-semibold">OK</th>
                <th className="text-left py-2 pr-4 font-semibold">Latency (ms)</th>
                <th className="text-left py-2 pr-4 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(health).map(([name, module]) => (
                <tr
                  key={name}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="py-2 pr-4 capitalize">{name}</td>
                  <td className="py-2 pr-4">{statusBadge(module.status)}</td>
                  <td className="py-2 pr-4">{module.ok ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">
                    {module.latency_ms != null ? module.latency_ms : "-"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-red-500">
                    {module.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-sm font-medium mb-2">Raw JSON</h2>
        <pre className="text-xs whitespace-pre-wrap break-all max-h-72 overflow-auto bg-black/80 text-green-300 rounded-lg p-3">
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>

      {error && (
        <p className="text-xs text-red-400">
          Last refresh error: <span className="font-mono">{error}</span>
        </p>
      )}
    </div>
  );
}
