"use client";

import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  timestamp: string;
  endpoint: string;
  model: string;
  status: "ok" | "error";
  tokens?: number;
};

type LogsResponse = {
  logs: LogEntry[];
};

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/logs");
        if (!res.ok) {
          throw new Error(`Failed to load logs (${res.status})`);
        }

        const json = (await res.json()) as LogsResponse;
        setLogs(json.logs ?? []);
      } catch (err: any) {
        console.error("Failed to load logs", err);
        setError(err?.message ?? "Failed to load logs");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  return (
    <div className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold">Request Logs</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This page will evolve into a full logs viewer with filters, search, and
        pagination. Data below currently comes from the <code>/api/logs</code> endpoint.
      </p>

      {loading && (
        <div
          className="
            rounded-xl border 
            border-gray-300 dark:border-neutral-800
            bg-white dark:bg-neutral-900
            p-4 text-sm
            text-gray-700 dark:text-gray-300
          "
        >
          Loading logs from <code>/api/logs</code>...
        </div>
      )}

      {error && !loading && (
        <div
          className="
            rounded-xl border 
            border-red-300 dark:border-red-600/70
            bg-red-50 dark:bg-red-900/30
            p-4 text-sm
            text-red-700 dark:text-red-200
          "
        >
          {error}
        </div>
      )}

      {!loading && !error && (
        <div
          className="
            rounded-xl border 
            border-gray-300 dark:border-neutral-800
            bg-white dark:bg-neutral-900
            p-4
          "
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent requests</h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Placeholder demo data from API.
            </span>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No logs available yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-neutral-800">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Endpoint</th>
                    <th className="py-2 pr-4">Model</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 dark:border-neutral-900 last:border-0"
                    >
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                        {log.endpoint}
                      </td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                        {log.model}
                      </td>
                      <td className="py-2 pr-4">
                        {log.status === "ok" ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-300">
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-300">
                            Error
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-800 dark:text-gray-200">
                        {log.tokens ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-600 dark:text-gray-400">
            Later, this table will be backed by real request logs stored in
            Postgres/Supabase with filters for endpoint, model, status, and date
            ranges.
          </p>
        </div>
      )}
    </div>
  );
}
