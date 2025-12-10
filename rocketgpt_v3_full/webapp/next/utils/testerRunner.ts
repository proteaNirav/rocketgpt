import { randomUUID } from "crypto";
import { spawn } from "child_process";

export type TesterStatus = "success" | "failed" | "error" | "partial";

export interface TesterRunRequest {
  runId: string;
  planId?: string | number;
  goalTitle?: string;
  goalSummary?: string;
  buildArtifacts?: any[];
  /**
   * The command to run tests.
   * Example: "pnpm test", "pnpm test:e2e", "npm test"
   */
  testCommand?: string;
}

export interface TesterResultEntry {
  test_case: string;
  status: "passed" | "failed" | "skipped" | "error";
  error: string | null;
  duration_ms: number | null;
}

export interface TesterRunResponse {
  test_run_id: string;
  status: TesterStatus;
  summary: string;
  results: TesterResultEntry[];
  logs: string[];
  artifacts: string[];
}

/**
 * Core test runner used by /api/tester/run.
 * It runs the configured test command via child_process.spawn and
 * maps the result into TesterRunResponse.
 */
export async function runTests(
  request: Partial<TesterRunRequest>
): Promise<TesterRunResponse> {
  const runId = request.runId ?? randomUUID();
  const testCommand = request.testCommand?.trim() || "pnpm test";

  const logs: string[] = [];
  const start = Date.now();

  const baseResponse = {
    test_run_id: runId,
    logs,
    artifacts: [] as string[],
  };

  return new Promise<TesterRunResponse>((resolve) => {
    try {
      logs.push(`Starting test command: ${testCommand}`);
      logs.push(`Working directory: ${process.cwd()}`);

      const child = spawn(testCommand, {
        shell: true,
        cwd: process.cwd(),
        env: process.env,
      });

      child.stdout.on("data", (data) => {
        logs.push(data.toString());
      });

      child.stderr.on("data", (data) => {
        logs.push(data.toString());
      });

      child.on("error", (err) => {
        const duration = Date.now() - start;

        resolve({
          ...baseResponse,
          status: "error",
          summary: `Test execution failed to start: ${err.message}`,
          results: [
            {
              test_case: testCommand,
              status: "error",
              error: err.message,
              duration_ms: duration,
            },
          ],
        });
      });

      child.on("close", (code) => {
        const duration = Date.now() - start;
        const success = code === 0;

        const status: TesterStatus = success ? "success" : "failed";
        const summary = success
          ? "Test execution completed successfully (RealTester runner)."
          : `Test execution completed with failures (exit code ${code}).`;

        const resultEntry: TesterResultEntry = {
          test_case: testCommand,
          status: success ? "passed" : "failed",
          error: success ? null : `Exit code ${code}`,
          duration_ms: duration,
        };

        resolve({
          ...baseResponse,
          status,
          summary,
          results: [resultEntry],
        });
      });
    } catch (err: any) {
      const duration = Date.now() - start;
      logs.push(String(err?.message ?? err));

      resolve({
        ...baseResponse,
        status: "error",
        summary: "Unexpected error while running tests in testerRunner.",
        results: [
          {
            test_case: testCommand,
            status: "error",
            error: String(err?.message ?? err),
            duration_ms: duration,
          },
        ],
      });
    }
  });
}
