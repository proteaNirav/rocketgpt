"use client";

import React, { useState } from "react";

type StartRunResponse = {
  success?: boolean;
  runId?: number;
  goal_title?: string;
  goal_description?: string;
  planner_model?: string;
  builder_model?: string;
  planner?: {
    durationMs: number;
    stepsCount: number;
    rawText: string;
  };
  builder?: {
    insertedStepsCount: number;
    executedCount: number;
    remainingPending: number;
    executions: {
      stepId: number;
      planner_step_no: number;
      builder_step_no: number;
      status: string;
      errorMessage: string | null;
      durationMs: number;
    }[];
    durationMs: number;
  };
  totalDurationMs?: number;
  error?: string;
  message?: string;
};

export default function StartRunPage() {
  const [goalTitle, setGoalTitle] = useState<string>(
    "Add Dark Mode to Settings UI"
  );
  const [goalDescription, setGoalDescription] = useState<string>(
    "Implement dark mode toggle and theming for settings page."
  );
  const [contextNotes, setContextNotes] = useState<string>(
    "Use existing layout and theming structure where possible."
  );
  const [plannerModel, setPlannerModel] = useState<string>("gpt-4.1-mini");
  const [builderModel, setBuilderModel] = useState<string>("gpt-4.1-mini");
  const [maxBuilderSteps, setMaxBuilderSteps] = useState<number>(10);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<StartRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) {
      setError("Goal title is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        goal_title: goalTitle.trim(),
        goal_description: goalDescription.trim() || undefined,
        context_notes: contextNotes.trim() || undefined,
        planner_model: plannerModel,
        builder_model: builderModel,
        max_builder_steps: maxBuilderSteps || undefined
      };

      const res = await fetch("/api/orchestrator/start-run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = (await res.json()) as StartRunResponse | any;

      if (!res.ok) {
        setError(
          data?.message ??
            data?.error ??
            "Failed to start orchestration run."
        );
        setResult(null);
        return;
      }

      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error starting orchestration run.");
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  const builderRunId = result?.runId;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">
        Orchestrator · Start Run
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Create a new orchestration run. This will call Planner to generate a
        plan, create Builder steps, and automatically execute all pending
        Builder steps for the run.
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 border rounded-lg p-4 bg-neutral-900/40"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="goalTitle" className="text-sm font-medium">
            Goal Title *
          </label>
          <input
            id="goalTitle"
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500"
            placeholder="Short description of the goal"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="goalDescription" className="text-sm font-medium">
            Goal Description
          </label>
          <textarea
            id="goalDescription"
            value={goalDescription}
            onChange={(e) => setGoalDescription(e.target.value)}
            className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500 min-h-[64px]"
            placeholder="Additional details about the change you want to implement"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="contextNotes" className="text-sm font-medium">
            Context / Constraints
          </label>
          <textarea
            id="contextNotes"
            value={contextNotes}
            onChange={(e) => setContextNotes(e.target.value)}
            className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500 min-h-[64px]"
            placeholder="Existing architecture, constraints, or notes for Planner"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="plannerModel" className="text-sm font-medium">
              Planner Model
            </label>
            <select
              id="plannerModel"
              value={plannerModel}
              onChange={(e) => setPlannerModel(e.target.value)}
              className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500"
            >
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="builderModel" className="text-sm font-medium">
              Builder Model
            </label>
            <select
              id="builderModel"
              value={builderModel}
              onChange={(e) => setBuilderModel(e.target.value)}
              className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500"
            >
              <option value="gpt-4.1-mini">gpt-4.1-mini</option>
              <option value="gpt-4.1">gpt-4.1</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="maxBuilderSteps" className="text-sm font-medium">
              Max Builder Steps (per run)
            </label>
            <input
              id="maxBuilderSteps"
              type="number"
              min={1}
              value={maxBuilderSteps}
              onChange={(e) =>
                setMaxBuilderSteps(Number(e.target.value) || 0)
              }
              className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 text-sm focus:outline-none focus:ring focus:ring-sky-500 w-28"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
        >
          {submitting ? "Starting Run…" : "Start Orchestration Run"}
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-400 border border-red-700 rounded-md px-3 py-2 bg-red-950/40">
          {error}
        </div>
      )}

      {result && result.success && (
        <div className="space-y-4 border rounded-lg px-4 py-3 bg-neutral-900/40">
          <h2 className="text-lg font-semibold mb-1">Run Summary</h2>

          <div className="text-sm space-y-1">
            <div>
              <span className="font-medium">Run ID:</span>{" "}
              {result.runId}
            </div>
            <div>
              <span className="font-medium">Goal:</span>{" "}
              {result.goal_title}
            </div>
            {result.goal_description && (
              <div>
                <span className="font-medium">Description:</span>{" "}
                {result.goal_description}
              </div>
            )}
            <div>
              <span className="font-medium">Planner Model:</span>{" "}
              {result.planner_model}
            </div>
            <div>
              <span className="font-medium">Builder Model:</span>{" "}
              {result.builder_model}
            </div>
          </div>

          {result.planner && (
            <div className="text-sm space-y-1">
              <div className="font-medium">Planner</div>
              <div>
                Steps: {result.planner.stepsCount} · Duration:{" "}
                {result.planner.durationMs} ms
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-neutral-400">
                  Show raw planner JSON
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap bg-neutral-950 p-2 rounded border border-neutral-800 max-h-64 overflow-auto">
                  {result.planner.rawText}
                </pre>
              </details>
            </div>
          )}

          {result.builder && (
            <div className="text-sm space-y-1">
              <div className="font-medium">Builder</div>
              <div>
                Steps inserted: {result.builder.insertedStepsCount} · Executed:{" "}
                {result.builder.executedCount} · Remaining pending:{" "}
                {result.builder.remainingPending} · Duration:{" "}
                {result.builder.durationMs} ms
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-neutral-400">
                  Show executions
                </summary>
                <div className="mt-2 max-h-64 overflow-auto border border-neutral-800 rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-neutral-900">
                      <tr>
                        <th className="px-2 py-1 text-left border-b border-neutral-800">
                          Step
                        </th>
                        <th className="px-2 py-1 text-left border-b border-neutral-800">
                          Status
                        </th>
                        <th className="px-2 py-1 text-left border-b border-neutral-800">
                          Duration (ms)
                        </th>
                        <th className="px-2 py-1 text-left border-b border-neutral-800">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.builder.executions?.map((ex) => (
                        <tr
                          key={ex.stepId}
                          className="odd:bg-neutral-950 even:bg-neutral-900/40"
                        >
                          <td className="px-2 py-1 border-b border-neutral-900">
                            {ex.planner_step_no}.{ex.builder_step_no}
                          </td>
                          <td className="px-2 py-1 border-b border-neutral-900">
                            {ex.status}
                          </td>
                          <td className="px-2 py-1 border-b border-neutral-900">
                            {ex.durationMs}
                          </td>
                          <td className="px-2 py-1 border-b border-neutral-900">
                            {ex.errorMessage ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}

          {typeof result.totalDurationMs === "number" && (
            <div className="text-sm">
              <span className="font-medium">Total Orchestrator Time:</span>{" "}
              {result.totalDurationMs} ms
            </div>
          )}

          {builderRunId && (
            <div className="mt-2 text-sm">
              To inspect generated Builder steps, open{" "}
              <code className="px-1 py-0.5 rounded bg-neutral-900 border border-neutral-700">
                /console/builder
              </code>{" "}
              and set <span className="font-medium">Run ID</span> to{" "}
              <span className="font-mono">{builderRunId}</span>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
