/**
 * RocketGPT — Orchestrator → Tester Client
 * Phase 3: Orchestrator–Tester Integration
 */

export type BuilderOutputFile = {
  filename: string;
  content: string;
};

export type BuilderOutputPayload = {
  files: BuilderOutputFile[];
};

export type TesterRequest = {
  plan_id: string;
  step_id: string;
  builder_output: BuilderOutputPayload;
  test_run_id?: string;
};

export type TesterResultItem = {
  test_case: string;
  status: "passed" | "failed";
  error: string | null;
  duration_ms: number;
};

export type TesterResponse = {
  test_run_id: string;
  status: "success" | "failed" | "crashed" | "timeout";
  summary: string;
  results: TesterResultItem[];
  logs: string[];
  artifacts: { filename: string; url?: string }[];
};

const TESTER_URL =
  process.env.RGPT_TESTER_URL ?? "http://localhost:3000/api/tester/run";

/**
 * callTesterFromOrchestrator
 *
 * Used by Orchestrator server routes to invoke the Tester.
 */
export async function callTesterFromOrchestrator(
  payload: TesterRequest,
): Promise<TesterResponse> {
  const res = await fetch(TESTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Tester API responded with ${res.status}: ${res.statusText} ${text}`,
    );
  }

  const json = (await res.json()) as TesterResponse;
  return json;
}
