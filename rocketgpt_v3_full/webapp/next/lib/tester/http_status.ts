export type HttpStatusCategory =
  | "1xx-info"
  | "2xx-success"
  | "3xx-redirect"
  | "4xx-client-error"
  | "5xx-server-error"
  | "unknown";

export type HttpExpectationMode = "exact" | "category" | "none";

export type HttpStatusExpectation = {
  mode: HttpExpectationMode;
  expectedCode?: number;
  expectedCategory?: HttpStatusCategory;
};

export type HttpStatusEvaluation = {
  status_code: number | null;
  category: HttpStatusCategory | null;
  expected: HttpStatusExpectation;
  result: "match" | "mismatch" | "error";
  message: string;
};

function getCategory(code: number | null): HttpStatusCategory {
  if (code == null) return "unknown";
  if (code >= 100 && code < 200) return "1xx-info";
  if (code >= 200 && code < 300) return "2xx-success";
  if (code >= 300 && code < 400) return "3xx-redirect";
  if (code >= 400 && code < 500) return "4xx-client-error";
  if (code >= 500 && code < 600) return "5xx-server-error";
  return "unknown";
}

/**
 * Default HTTP expectations per profile.
 * Mirrors what we used in the smoke outputs:
 * - base/light/stress: expect 2xx-success
 * - full/regression: expect exact 200
 */
export function defaultExpectationForProfile(
  profileId: string
): HttpStatusExpectation {
  switch (profileId) {
    case "full":
    case "regression":
      return {
        mode: "exact",
        expectedCode: 200,
      };
    case "base":
    case "light":
    case "stress":
    default:
      return {
        mode: "category",
        expectedCategory: "2xx-success",
      };
  }
}

export function evaluateHttpStatus(
  statusCode: number,
  expectation: HttpStatusExpectation
): HttpStatusEvaluation {
  const category = getCategory(statusCode);

  if (expectation.mode === "none") {
    return {
      status_code: statusCode,
      category,
      expected: expectation,
      result: "match",
      message: "No HTTP expectation configured (mode=none); treating as match.",
    };
  }

  if (expectation.mode === "exact") {
    const ok = expectation.expectedCode === statusCode;
    return {
      status_code: statusCode,
      category,
      expected: expectation,
      result: ok ? "match" : "mismatch",
      message: ok
        ? `Got expected status code ${statusCode}.`
        : `Expected status code ${expectation.expectedCode}, but got ${statusCode}.`,
    };
  }

  if (expectation.mode === "category") {
    const ok = expectation.expectedCategory === category;
    return {
      status_code: statusCode,
      category,
      expected: expectation,
      result: ok ? "match" : "mismatch",
      message: ok
        ? `Got expected HTTP category ${category}.`
        : `Expected HTTP category ${expectation.expectedCategory}, but got ${category}.`,
    };
  }

  return {
    status_code: statusCode,
    category,
    expected: expectation,
    result: "error",
    message: "Unknown HTTP expectation mode.",
  };
}
