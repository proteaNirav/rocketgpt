"use client";

import React, { useEffect, useState } from "react";

type KnowledgeIndex = {
  runAtUtc?: string;
  naturalLanguagesTracked?: number;
  programmingLanguagesTracked?: number;
  domainsTracked?: number;
  notes?: string;
};

type OrchestratorStatus = {
  ok: boolean;
  knowledgeIndex?: KnowledgeIndex | null;
  ideaCount?: number;
  researchCount?: number;
  domainCount?: number;
};

export default function OrchestratorDashboardPage() {
  const [status, setStatus] = useState<OrchestratorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/demo/orchestrator/status");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as OrchestratorStatus;
        setStatus(data);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to load orchestrator status.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function runSelfStudy() {
    setError(null);
    try {
      const res = await fetch("/api/demo/self-study", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus((prev) => ({
        ...(prev ?? { ok: true }),
        knowledgeIndex: data.summary
      }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Failed to run self-study.");
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-start p-4 gap-4">
      <div className="w-full max-w-4xl border rounded-xl p-4 shadow-sm bg-white/80 dark:bg-neutral-900/80">
        <h1 className="text-2xl font-semibold mb-2">
          RocketGPT Orchestrator Dashboard (Demo)
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This dashboard shows a demo view of RocketGPT&apos;s internal
          self-knowledge: domains, languages, ideas, and research logs. Use the{" "}
          <span className="font-semibold">Run Self-Study</span> button to
          trigger a simple self-study run that updates the knowledge index.
        </p>

        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={runSelfStudy}
            className="px-4 py-2 rounded-lg text-sm font-medium border bg-blue-600 text-white disabled:opacity-60"
            disabled={loading}
          >
            Run Self-Study (Demo)
          </button>
        </div>

        {loading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading orchestrator status…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 mb-2">Error: {error}</div>
        )}

        {!loading && status && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-neutral-900">
              <h2 className="font-semibold text-sm mb-1">
                Knowledge Index (Self-Study)
              </h2>
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <div>
                  Last run:{" "}
                  {status.knowledgeIndex?.runAtUtc ?? "never (run now)"}
                </div>
                <div>
                  Natural languages tracked:{" "}
                  {status.knowledgeIndex?.naturalLanguagesTracked ?? 0}
                </div>
                <div>
                  Programming languages tracked:{" "}
                  {status.knowledgeIndex?.programmingLanguagesTracked ?? 0}
                </div>
                <div>
                  Domains tracked:{" "}
                  {status.knowledgeIndex?.domainsTracked ??
                    status.domainCount ??
                    0}
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3 bg-gray-50 dark:bg-neutral-900">
              <h2 className="font-semibold text-sm mb-1">
                Ideas & Research Activity
              </h2>
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <div>Self-innovation ideas logged: {status.ideaCount ?? 0}</div>
                <div>
                  Self-research sessions logged: {status.researchCount ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
