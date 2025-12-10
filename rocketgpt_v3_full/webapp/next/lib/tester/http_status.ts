/**
 * Category used for logic, grouping and evaluation.
 */
export type HttpStatusCategory =
  | "2xx-success"
  | "3xx-redirect"
  | "4xx-client"
  | "5xx-server"
  | "network-error";

/**
 * Expected HTTP behaviour for a test case.
 * - exact: expect a specific status code
 * - category: expect a class of status codes (e.g. any 2xx)
 * - none: no expectation given (use profile + test-case defaults)
 */
export interface HttpStatusExpectation {
  mode: "exact" | "category" | "none";
  expectedCode?: number;
  expectedCategory?: HttpStatusCategory;
}

/**
 * Final evaluation object produced by tester engine.
 * This is consumed by:
 * - Tester /api/tester/run
 * - Orchestrator /api/orchestrator/tester/execute
 * - Builder/Test pipelines
 */
export interface HttpStatusEvaluation {
  status_code: number | null;       // null if network failure
  category: HttpStatusCategory;
  expected: HttpStatusExpectation;

  /**
   * - "match" → status matches expected code/category
   * - "mismatch" → code/category deviation detected
   * - "error" → network/transport/error
   */
  result: "match" | "mismatch" | "error";

  /**
   * Human-readable evaluation summary for logs.
   */
  message: string;
}

/**
 * Utility: derive category from numeric HTTP code.
 */
export function categorizeStatus(code: number | null): HttpStatusCategory {
  if (code === null || code <= 0) return "network-error";
  if (code >= 200 && code < 300) return "2xx-success";
  if (code >= 300 && code < 400) return "3xx-redirect";
  if (code >= 400 && code < 500) return "4xx-client";
  if (code >= 500) return "5xx-server";
  return "network-error";
}

/**
 * Utility: produce a default expectation based on tester profile strictness.
 * This will be expanded in a later step.
 */
export function defaultExpectationForProfile(
  strictness: "lenient" | "normal" | "strict" | "paranoid"
): HttpStatusExpectation {
  switch (strictness) {
    case "lenient":
      return { mode: "category", expectedCategory: "2xx-success" };
    case "normal":
      return { mode: "category", expectedCategory: "2xx-success" };
    case "strict":
      return { mode: "exact", expectedCode: 200 };
    case "paranoid":
      return { mode: "exact", expectedCode: 200 };
    default:
      return { mode: "category", expectedCategory: "2xx-success" };
  }
}
