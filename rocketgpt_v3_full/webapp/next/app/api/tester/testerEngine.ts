export type TesterProfile = {
  id: string;
  label: string;
  strictness: string;
  depth: string;
  maxTestCases: number;
  maxDurationMs: number;
  parallelism: number;
};

export type TesterEngineResult = {
  success: boolean;
  profile: TesterProfile;
  http: {
    status_code: number;
    category: string;
    expected: any;
    result: string;
    message: string;
  };
  summary: string;
  tests_executed: number;
  engine: {
    success: boolean;
    tests_executed: number;
    tests_passed: number;
    tests_failed: number;
    duration_ms: number;
    logs: string[];
    tests?: any[];
  };
  artifacts: any[];
  run_id?: string;
};

export function buildProfile(id: string): TesterProfile {
  return {
    id,
    label: "Base Smoke",
    strictness: "normal",
    depth: "smoke",
    maxTestCases: 3,
    maxDurationMs: 10_000,
    parallelism: 2,
  };
}

function categorizeStatus(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return "2xx-success";
  if (statusCode >= 100 && statusCode < 200) return "1xx-informational";
  if (statusCode >= 300 && statusCode < 400) return "3xx-redirect";
  if (statusCode >= 400 && statusCode < 500) return "4xx-client-error";
  if (statusCode >= 500 && statusCode < 600) return "5xx-server-error";
  return "unknown";
}

/**
 * Real-ish tester engine:
 * - Calls /api/orchestrator/builder/execute-all
 * - Evaluates HTTP status
 * - Produces logs + a test row for the HTTP evaluation
 *
 * Later we can plug more tests here (Playwright, deeper flows),
 * but the external shape stays unchanged.
 */
export async function runTesterEngine(
  profileId: string,
  goal: string,
  runId?: string
): Promise<TesterEngineResult> {
  const profile = buildProfile(profileId);
  const started = Date.now();

  const logs: string[] = [];
  const tests: any[] = [];
  const artifacts: any[] = [];

  logs.push("TesterEngine v1.1 started.");
  logs.push(`Profile: ${profileId}`);
  logs.push(`Goal: ${goal}`);

  let statusCode = 0;
  let category = "unknown";
  let httpResult: "match" | "mismatch" | "error" = "error";
  let httpMessage = "";

  const expectedCategory = "2xx-success";

  try {
    logs.push(
      "Calling /api/orchestrator/builder/execute-all to validate HTTP status..."
    );

    const res = await fetch(
      "http://localhost:3000/api/orchestrator/builder/execute-all",
      {
        method: "POST",
        headers: { "content-type": "application/json",
          ...(process.env.RGPT_INTERNAL_KEY ? { "x-rgpt-internal": process.env.RGPT_INTERNAL_KEY } : {}) },
        body: JSON.stringify({}),
      }
    );

    statusCode = res.status;
    category = categorizeStatus(statusCode);

    if (category === expectedCategory) {
      httpResult = "match";
      httpMessage = "Got expected HTTP category 2xx-success from orchestrator/builder/execute-all.";
      logs.push(
        `HTTP OK: status=${statusCode}, category=${category}, expected=${expectedCategory}.`
      );
    } else {
      httpResult = "mismatch";
      httpMessage = `Expected HTTP category ${expectedCategory}, but got ${category} (status=${statusCode}).`;
      logs.push(
        `HTTP MISMATCH: status=${statusCode}, category=${category}, expected=${expectedCategory}.`
      );
    }

    // Optionally read body just to confirm it is JSON (but we don't need to store it yet)
    try {
      const bodyJson = await res.json();
      logs.push(
        "Orchestrator/builder response body parsed as JSON (not stored in engine result)."
      );
      logs.push(
        `Body.highlevel: ${bodyJson?.message ?? "[no message field]"}`
      );
    } catch {
      logs.push("Warning: Failed to parse orchestrator/builder JSON body (non-fatal).");
    }

    tests.push({
      test_case: "orchestrator-builder-execute-all HTTP",
      status: httpResult === "match" ? "passed" : "failed",
      duration_ms: 0,
      details: {
        status_code: statusCode,
        category,
        expected_category: expectedCategory,
      },
    });
  } catch (err: any) {
    httpResult = "error";
    httpMessage =
      "Error while calling /api/orchestrator/builder/execute-all: " +
      (err?.message || String(err));
    logs.push(httpMessage);

    tests.push({
      test_case: "orchestrator-builder-execute-all HTTP",
      status: "failed",
      duration_ms: 0,
      details: {
        error: httpMessage,
      },
    });
  }

  const duration_ms = Date.now() - started;
  const tests_executed = tests.length;
  const tests_passed = tests.filter((t) => t.status === "passed").length;
  const tests_failed = tests.filter((t) => t.status === "failed").length;

  const engine = {
    success: httpResult === "match",
    tests_executed,
    tests_passed,
    tests_failed,
    duration_ms,
    logs,
    tests,
  };

  const summary =
    tests_failed === 0
      ? `Tester run: ${tests_executed} test(s), all passed.`
      : `Tester run: ${tests_executed} test(s), ${tests_failed} failed.`;

  const http = {
    status_code: statusCode,
    category,
    expected: {
      mode: "category",
      expectedCategory,
    },
    result: httpResult,
    message: httpMessage,
  };

  return {
    success: engine.success,
    profile,
    http,
    summary,
    tests_executed,
    engine,
    artifacts,
    run_id: runId,
  };
}

