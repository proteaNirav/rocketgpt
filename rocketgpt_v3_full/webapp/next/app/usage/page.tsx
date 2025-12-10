"use client";

import { useEffect, useState } from "react";

type UsageEntry = {
  date: string;
  requests: number;
  tokens: number;
};

type UsageResponse = {
  usage: UsageEntry[];
};

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsage() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/usage");
        if (!res.ok) {
          throw new Error(`Failed to load usage (${res.status})`);
        }

        const json = (await res.json()) as UsageResponse;
        setUsage(json.usage ?? []);
      } catch (err: any) {
        console.error("Failed to load usage", err);
        setError(err?.message ?? "Failed to load usage");
      } finally {
        setLoading(false);
      }
    }

    loadUsage();
  }, []);

  return (
    <div className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold">Usage Dashboard</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        This page will evolve into full usage analytics. Currently powered by <code>/api/usage</code>.
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
          Loading usage from <code>/api/usage</code>...
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
            <h2 className="text-sm font-semibold">Recent usage</h2>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Demo data from API.
            </span>
          </div>

          {usage.length === 0 ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No usage entries recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-neutral-800">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Requests</th>
                    <th className="py-2 pr-4 text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 dark:border-neutral-900 last:border-0"
                    >
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4 text-gray-800 dark:text-gray-200">
                        {row.requests}
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-800 dark:text-gray-200">
                        {row.tokens}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-600 dark:text-gray-400">
            Later, this page will show per-model usage, per-endpoint, billing estimates, and charts.
          </p>
        </div>
      )}
    </div>
  );
}
