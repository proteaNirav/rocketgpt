export type TesterExecutionResult = {
  success: boolean;
  tests_executed: number;
  tests_passed: number;
  tests_failed: number;
  duration_ms: number;
  logs: string[];
};

export interface TesterEngine {
  runTests(
    testCases: string[],
    options?: Record<string, unknown>
  ): Promise<TesterExecutionResult>;
}

/**
 * Simple stub engine — will be replaced later with actual runners (Vitest, Jest, Playwright, TestFlow, etc.)
 */
class StubTesterEngine implements TesterEngine {
  async runTests(
    testCases: string[],
    _options: Record<string, unknown> = {}
  ): Promise<TesterExecutionResult> {
    const start = Date.now();

    // Stub logic: treat all tests as "passed"
    const logs = [
      "StubTesterEngine started.",
      `Executing ${testCases.length} test case(s).`,
      "All tests passed (stub).",
      "StubTesterEngine completed.",
    ];

    return {
      success: true,
      tests_executed: testCases.length,
      tests_passed: testCases.length,
      tests_failed: 0,
      duration_ms: Date.now() - start,
      logs,
    };
  }
}

export function getTesterEngine(mode: "stub" | "real" = "stub"): TesterEngine {
  // Currently, only stub engine exists.
  return new StubTesterEngine();
}
