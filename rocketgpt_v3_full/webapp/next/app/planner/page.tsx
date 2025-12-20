"use client";

import { useState } from "react";

type PlannerStep = {
  id?: string;
  title?: string;
  description?: string;
};

type PlannerPlan = {
  plan_title?: string;
  goal_summary?: string;
  steps?: PlannerStep[];
};

type PlannerResponse = {
  model?: string;
  plan?: PlannerPlan;
  error?: any;
};

type BuilderResult = {
  summary?: string;
  details?: string;
};

type BuilderResponse = {
  model?: string;
  result?: BuilderResult;
  error?: any;
};

export default function PlannerPage() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<any | null>(null);
  const [plannerResult, setPlannerResult] = useState<PlannerResponse | null>(
    null
  );

  const [builderLoadingIndex, setBuilderLoadingIndex] = useState<number | null>(
    null
  );
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [builderRawError, setBuilderRawError] = useState<any | null>(null);
  const [builderResult, setBuilderResult] = useState<BuilderResponse | null>(
    null
  );
  const [builderStepIndex, setBuilderStepIndex] = useState<number | null>(null);

  async function runPlanner() {
    try {
      setLoading(true);
      setError(null);
      setRawError(null);
      setPlannerResult(null);
      setBuilderResult(null);
      setBuilderError(null);
      setBuilderRawError(null);
      setBuilderStepIndex(null);

      // Planner API expects { goal: string }
      const body = { goal };

      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();

      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          setRawError(json);
          const msg =
            json?.message ||
            json?.error?.message ||
            `Planner API failed (${res.status})`;
          setError(msg);
        } catch {
          setError(text || `Planner API failed (${res.status})`);
        }
        return;
      }

      const json = JSON.parse(text) as PlannerResponse;
      setPlannerResult(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function runBuilderForStep(index: number) {
    const plan = plannerResult?.plan;
    if (!goal || !plan?.steps || !plan.steps[index]) return;

    const step = plan.steps[index];

    try {
      setBuilderLoadingIndex(index);
      setBuilderError(null);
      setBuilderRawError(null);
      setBuilderResult(null);
      setBuilderStepIndex(index);

      const body = {
        goal,
        step: {
          ...step,
          index,
        },
      };

      const res = await fetch("/api/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();

      if (!res.ok) {
        try {
          const json = JSON.parse(text);
          setBuilderRawError(json);
          const msg =
            json?.message ||
            json?.error?.message ||
            `Builder API failed (${res.status})`;
          setBuilderError(msg);
        } catch {
          setBuilderError(text || `Builder API failed (${res.status})`);
        }
        return;
      }

      const json = JSON.parse(text) as BuilderResponse;
      setBuilderResult(json);
    } catch (err: any) {
      console.error(err);
      setBuilderError(err?.message ?? "Unknown error");
    } finally {
      setBuilderLoadingIndex(null);
    }
  }

  const plan = plannerResult?.plan;
  const steps = plan?.steps ?? [];
  const activeStep =
    builderStepIndex != null && steps[builderStepIndex]
      ? steps[builderStepIndex]
      : null;

  return (
    <div className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold">Planner Console</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Enter a software goal below. RocketGPT will call <code>/api/planner</code> to
        create a plan, and you can run individual steps via the Builder API.
      </p>

      {/* Goal input */}
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Describe your goal, e.g. 'Add dark mode to settings UI'"
        className="
          w-full h-32 rounded-xl border
          border-gray-300 dark:border-neutral-800
          bg-white dark:bg-neutral-900
          p-3 text-sm
        "
      />

      <button
        onClick={runPlanner}
        disabled={!goal || loading}
        className="
          rounded-lg px-4 py-2 text-sm font-medium
          bg-blue-600 text-white
          hover:bg-blue-700 disabled:opacity-50
        "
      >
        {loading ? "Planning..." : "Run Planner"}
      </button>

      {/* Planner error */}
      {error && (
        <div
          className="
            rounded-xl border border-red-300 dark:border-red-600/70
            bg-red-50 dark:bg-red-900/30
            p-4 text-sm text-red-700 dark:text-red-200 space-y-2
          "
        >
          <div>{error}</div>
          {rawError && (
            <pre className="mt-2 text-[11px] whitespace-pre-wrap">
              {JSON.stringify(rawError, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Planner success: Plan & Steps */}
      {plan && (
        <div
          className="
            rounded-xl border border-gray-300 dark:border-neutral-800
            bg-white dark:bg-neutral-900
            p-4 space-y-4
          "
        >
          {/* Plan header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                {plan.plan_title ?? "Plan"}
              </h2>
              {plan.goal_summary && (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {plan.goal_summary}
                </p>
              )}
            </div>
            {plannerResult?.model && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Model: {plannerResult.model}
              </span>
            )}
          </div>

          {/* Steps list as professional cards */}
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div
                key={step.id ?? idx}
                className="
                  rounded-lg border
                  border-gray-200 dark:border-neutral-800
                  bg-gray-50 dark:bg-neutral-950/40
                  p-3 text-sm
                "
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Step {idx + 1}
                    </div>
                    <div className="font-semibold">
                      {step.title ?? "Step"}
                    </div>
                  </div>
                  <button
                    onClick={() => runBuilderForStep(idx)}
                    disabled={builderLoadingIndex === idx}
                    className="
                      rounded-full px-3 py-1 text-[11px] font-medium
                      bg-emerald-600 text-white
                      hover:bg-emerald-700 disabled:opacity-50
                    "
                  >
                    {builderLoadingIndex === idx
                      ? "Running Builder…"
                      : "Run Builder"}
                  </button>
                </div>

                {step.description && (
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                    {step.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Raw Planner JSON */}
          <details className="mt-2">
            <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              Show raw Planner JSON
            </summary>
            <pre className="mt-2 text-[11px] whitespace-pre-wrap">
              {JSON.stringify(plannerResult, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Builder error */}
      {builderError && (
        <div
          className="
            rounded-xl border border-red-300 dark:border-red-600/70
            bg-red-50 dark:bg-red-900/30
            p-4 text-sm text-red-700 dark:text-red-200 space-y-2
          "
        >
          <div>{builderError}</div>
          {builderRawError && (
            <pre className="mt-2 text-[11px] whitespace-pre-wrap">
              {JSON.stringify(builderRawError, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Builder success */}
      {builderResult?.result && activeStep && (
        <div
          className="
            rounded-xl border border-gray-300 dark:border-neutral-800
            bg-white dark:bg-neutral-900
            p-4 space-y-3
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Builder Output</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                For step {builderStepIndex! + 1}: {activeStep.title ?? "Step"}
              </p>
            </div>
            {builderResult.model && (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Model: {builderResult.model}
              </span>
            )}
          </div>

          {builderResult.result.summary && (
            <p className="text-sm font-medium">
              {builderResult.result.summary}
            </p>
          )}

          {builderResult.result.details && (
            <pre className="mt-2 text-xs whitespace-pre-wrap">
              {builderResult.result.details}
            </pre>
          )}

          <details className="mt-3">
            <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              Show raw Builder JSON
            </summary>
            <pre className="mt-2 text-[11px] whitespace-pre-wrap">
              {JSON.stringify(builderResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
