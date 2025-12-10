"use client";

import { useState } from "react";

type HttpExpectation = {
  mode: "exact" | "category" | "none";
  expectedCode?: number;
  expectedCategory?: string;
};

type HttpEvaluation = {
  status_code: number | null;
  category: string | null;
  expected: HttpExpectation;
  result: "match" | "mismatch" | "error";
  message: string;
};

type TesterProfile = {
  id: string;
  label: string;
  strictness: string;
  depth: string;
  maxTestCases: number | null;
  maxDurationMs: number | null;
  parallelism: number | null;
};

type TesterBlock = {
  success: boolean | null;
  profile: TesterProfile | null;
  http: HttpEvaluation | null;
  summary: string | null;
  tests_executed: number | null;
};

type OrchestratorBlock = {
  status_code: number;
  status_text: string;
};

type OrchestratorTesterResponse = {
  success: boolean;
  orchestrator: OrchestratorBlock;
  tester: TesterBlock;
  tester_raw?: unknown;
  forwarded_request?: unknown;
};

const PROFILES = ["base", "light", "full", "stress", "regression"] as const;

export default function TesterPage() {
  const [profile, setProfile] = useState<string>("base");
  const [goal, setGoal] = useState<string>(
    "Orchestrator → Tester HTTP status + profile test"
  );
  const [runId, setRunId] = useState<string>("orch-tester-ui");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorTesterResponse | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        goal,
        run_id: runId || undefined,
        profile,
        test_cases: ["sample-orchestrator-test.js"],
        options: {
          from_ui: "tester-page",
        },
      };

      const res = await fetch("/api/orchestrator/tester/execute", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as OrchestratorTesterResponse;

      setResult(json);

      if (!res.ok || !json.success) {
        setError(
          `Tester call did not fully succeed (HTTP ${res.status} / success=${json.success})`
        );
      }
    } catch (err: any) {
      console.error("Tester UI error:", err);
      setError(err?.message ?? "Unexpected error while calling tester endpoint.");
    } finally {
      setLoading(false);
    }
  }

  const testerHttp = result?.tester?.http ?? null;
  const testerProfile = result?.tester?.profile ?? null;

  return (
    <div className="min-h-screen w-full px-4 py-6 md:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Tester Profiles &amp; HTTP Status
          </h1>
          <p className="text-sm text-muted-foreground">
            Run the <code>/api/orchestrator/tester/execute</code> endpoint with
            different profiles and inspect the HTTP evaluation.
          </p>
        </header>

        <section className="grid gap-4 rounded-xl border bg-background/60 p-4 shadow-sm md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] md:gap-6">
          <div className="space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Request
            </h2>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Profile
                </label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                >
                  {PROFILES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Goal
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Run ID (optional)
                </label>
                <input
                  type="text"
                  value={runId}
                  onChange={(e) => setRunId(e.target.value)}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={loading}
                className="inline-flex items-center rounded-md border border-transparent bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Running..." : "Run Orchestrator Tester"}
              </button>
              {error && (
                <p className="mt-2 text-xs text-red-500">
                  {error}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Orchestrator HTTP
            </h2>
            {result ? (
              <div className="rounded-md border bg-background/50 p-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Status</span>
                  <span>
                    {result.orchestrator.status_code}{" "}
                    {result.orchestrator.status_text}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Success</span>
                  <span>{String(result.success)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No run yet. Submit a request to see HTTP status.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border bg-background/60 p-4 shadow-sm md:grid-cols-2 md:gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Tester Profile &amp; Summary
            </h2>
            {result && testerProfile ? (
              <div className="space-y-2 rounded-md border bg-background/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{testerProfile.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {testerProfile.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Strictness
                    </span>
                    <div>{testerProfile.strictness}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Depth
                    </span>
                    <div>{testerProfile.depth}</div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Max Cases
                    </span>
                    <div>
                      {testerProfile.maxTestCases ?? <span>∞</span>}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground">
                      Parallelism
                    </span>
                    <div>{testerProfile.parallelism ?? "-"}</div>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Summary
                  </span>
                  <div>{result.tester.summary ?? "—"}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No tester profile yet. Run a test to see profile and summary.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Tester HTTP Evaluation
            </h2>
            {result && testerHttp ? (
              <div className="space-y-2 rounded-md border bg-background/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Status Code</span>
                  <span>{testerHttp.status_code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category</span>
                  <span>{testerHttp.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Result</span>
                  <span>{testerHttp.result}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">
                    Expected
                  </span>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[11px]">
{JSON.stringify(testerHttp.expected, null, 2)}
                  </pre>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground">
                    Message
                  </span>
                  <div>{testerHttp.message}</div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No HTTP evaluation yet. Run a test to see the HTTP status model.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
