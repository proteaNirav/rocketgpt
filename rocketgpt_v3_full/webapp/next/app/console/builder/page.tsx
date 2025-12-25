"use client";

import React, { useCallback, useEffect, useState } from "react";

type BuilderStepRow = {
  id: number;
  run_id: number;
  planner_step_no: number;
  builder_step_no: number;
  title: string;
  instruction: string;
  llm_input: string | null;
  llm_output: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type ListResponse = {
  success: boolean;
  runId: number;
  count: number;
  steps: BuilderStepRow[];
};

type ExecuteResponse = {
  success?: boolean;
  runId?: number;
  step?: BuilderStepRow | null;
  done?: boolean;
  message?: string;
  durationMs?: number;
  error?: string;
};

type ExecuteAllResponse = {
  success?: boolean;
  runId?: number;
  executedCount?: number;
  executions?: {
    stepId: number;
    planner_step_no: number;
    builder_step_no: number;
    status: string;
    errorMessage: string | null;
    durationMs: number;
  }[];
  remainingPending?: number | null;
  durationMs?: number;
  message?: string;
  error?: string;
};

export default function BuilderConsolePage() {
  const [runId, setRunId] = useState<number>(123);
  const [steps, setSteps] = useState<BuilderStepRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executingAll, setExecutingAll] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSteps = useCallback(async () => {
    if (!Number.isFinite(runId)) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/orchestrator/builder/list?runId=${encodeURIComponent(runId)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

      const data = (await res.json()) as ListResponse | any;

      if (!res.ok) {
        setError(
          data?.message ??
            data?.error ??
            "Failed to load builder steps for this run."
        );
        setSteps([]);
        return;
      }

      setSteps(data.steps ?? []);
      setMessage(`Loaded ${data.steps?.length ?? 0} step(s) for runId ${runId}.`);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error loading builder steps.");
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [runId]);

  const executeNextStep = useCallback(async () => {
    if (!Number.isFinite(runId)) return;
    setExecuting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/orchestrator/builder/execute-next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ runId })
      });

      const data = (await res.json()) as ExecuteResponse | any;

      if (!res.ok) {
        setError(
          data?.message ?? data?.error ?? "Failed to execute next builder step."
        );
        return;
      }

      if (data.done) {
        setMessage(data.message ?? "No pending steps for this run.");
      } else if (data.step) {
        setMessage(
          `Executed step #${data.step.planner_step_no}.${data.step.builder_step_no} in ${
            data.durationMs ?? 0
          } ms.`
        );
      } else {
        setMessage("Execution completed.");
      }

      await loadSteps();
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error executing next builder step.");
    } finally {
      setExecuting(false);
    }
  }, [runId, loadSteps]);

  const executeAllSteps = useCallback(async () => {
    if (!Number.isFinite(runId)) return;
    setExecutingAll(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/orchestrator/builder/execute-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ runId })
      });

      const data = (await res.json()) as ExecuteAllResponse | any;

      if (!res.ok) {
        setError(
          data?.message ??
            data?.error ??
            "Failed to execute all pending builder steps."
        );
        return;
      }

      const executedCount = data.executedCount ?? 0;
      const remaining = data.remainingPending ?? 0;
      const totalDuration = data.durationMs ?? 0;

      setMessage(
        `${data.message ?? "Execution finished."} ` +
          `Executed ${executedCount} step(s), remaining pending: ${remaining}, ` +
          `total time: ${totalDuration} ms.`
      );

      await loadSteps();
    } catch (err: any) {
      setError(
        err?.message ?? "Unexpected error executing all pending builder steps."
      );
    } finally {
      setExecutingAll(false);
    }
  }, [runId, loadSteps]);

  useEffect(() => {
    loadSteps();
  }, [loadSteps]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">
        Orchestrator · Builder Console
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        View and execute builder steps for a given Orchestrator run.
      </p>

      <div className="flex flex-wrap items-end gap-4 border rounded-lg p-4 bg-neutral-900/40">
        <div className="flex flex-col">
          <label htmlFor="runId" className="text-sm font-medium mb-1">
            Run ID
          </label>
          <input
            id="runId"
            type="number"
            value={Number.isFinite(runId) ? runId : ""}
            onChange={(e) => setRunId(Number(e.target.value) || 0)}
            className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500"
          />
        </div>

        <button
          type="button"
          onClick={loadSteps}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-sm font-medium"
        >
          {loading ? "Loading..." : "Load Steps"}
        </button>

        <button
          type="button"
          onClick={executeNextStep}
          disabled={executing}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
        >
          {executing ? "Executing..." : "Run Next Step"}
        </button>

        <button
          type="button"
          onClick={executeAllSteps}
          disabled={executingAll}
          className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
        >
          {executingAll ? "Running All…" : "Run All Pending"}
        </button>
      </div>

      {message && (
        <div className="text-sm text-emerald-400 border border-emerald-700 rounded-md px-3 py-2 bg-emerald-950/40">
          {message}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 border border-red-700 rounded-md px-3 py-2 bg-red-950/40">
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-3 py-2 text-left border-b border-neutral-800">#</th>
              <th className="px-3 py-2 text-left border-b border-neutral-800">
                Planner
              </th>
              <th className="px-3 py-2 text-left border-b border-neutral-800">
                Builder
              </th>
              <th className="px-3 py-2 text-left border-b border-neutral-800">
                Title
              </th>
              <th className="px-3 py-2 text-left border-b border-neutral-800">
                Status
              </th>
              <th className="px-3 py-2 text-left border-b border-neutral-800">
                LLM Output (preview)
              </th>
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-neutral-500"
                >
                  No builder steps found for this run.
                </td>
              </tr>
            ) : (
              steps.map((step, index) => (
                <tr
                  key={step.id}
                  className="odd:bg-neutral-950 even:bg-neutral-900/40"
                >
                  <td className="px-3 py-2 border-b border-neutral-900">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2 border-b border-neutral-900">
                    {step.planner_step_no}
                  </td>
                  <td className="px-3 py-2 border-b border-neutral-900">
                    {step.builder_step_no}
                  </td>
                  <td className="px-3 py-2 border-b border-neutral-900">
                    {step.title}
                  </td>
                  <td className="px-3 py-2 border-b border-neutral-900">
                    <span
                      className={
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium " +
                        (step.status === "success"
                          ? "bg-emerald-900/60 text-emerald-300"
                          : step.status === "running"
                          ? "bg-sky-900/60 text-sky-300"
                          : step.status === "failed"
                          ? "bg-red-900/60 text-red-300"
                          : "bg-neutral-800 text-neutral-200")
                      }
                    >
                      {step.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 border-b border-neutral-900 max-w-md">
                    <div className="line-clamp-3 whitespace-pre-wrap text-neutral-300">
                      {step.llm_output
                        ? step.llm_output.slice(0, 300) +
                          (step.llm_output.length > 300 ? "…" : "")
                        : step.error_message
                        ? `Error: ${step.error_message}`
                        : "—"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
