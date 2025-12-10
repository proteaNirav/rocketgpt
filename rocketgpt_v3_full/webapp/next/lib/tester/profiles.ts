export type TesterProfileId =
  | "base"
  | "light"
  | "full"
  | "stress"
  | "regression";

export interface TesterProfileConfig {
  /** Machine id, e.g. "base" */
  id: TesterProfileId;

  /** Human-readable label for logs / UI */
  label: string;

  /** When to use this profile */
  description: string;

  /** Whether this should be used when no profile is specified */
  isDefault: boolean;

  /** Max number of test cases to execute (null = no limit) */
  maxTestCases: number | null;

  /** Hard timeout for the whole run (null = no global timeout) */
  maxDurationMs: number | null;

  /** Degree of parallelism for executing tests */
  parallelism: number;

  /** Level of depth for checks */
  depth: "smoke" | "quick" | "standard" | "deep" | "exhaustive";

  /** Include integration-style tests (cross-API flows, chains) */
  includeIntegration: boolean;

  /** Include E2E-style tests (planner→builder→tester sequences) */
  includeE2E: boolean;

  /** Include load/stress style tests */
  includeLoad: boolean;

  /** Include more expensive / long-running checks */
  includeExpensiveChecks: boolean;

  /** How strict HTTP / assertion behaviour should be */
  strictness: "lenient" | "normal" | "strict" | "paranoid";
}

/**
 * Lookup map for all supported profiles.
 */
export const TESTER_PROFILES: Record<TesterProfileId, TesterProfileConfig> = {
  base: {
    id: "base",
    label: "Base Smoke",
    description:
      "Fast smoke tests to validate health and basic behaviour. Safe as a default for most calls.",
    isDefault: true,
    maxTestCases: 3,
    maxDurationMs: 10_000,
    parallelism: 2,
    depth: "smoke",
    includeIntegration: false,
    includeE2E: false,
    includeLoad: false,
    includeExpensiveChecks: false,
    strictness: "normal",
  },
  light: {
    id: "light",
    label: "Light Quick-Check",
    description:
      "Slightly deeper than base. Good for quick interactive checks during development.",
    isDefault: false,
    maxTestCases: 10,
    maxDurationMs: 30_000,
    parallelism: 3,
    depth: "quick",
    includeIntegration: true,
    includeE2E: false,
    includeLoad: false,
    includeExpensiveChecks: false,
    strictness: "normal",
  },
  full: {
    id: "full",
    label: "Full Diagnostic",
    description:
      "Deep, high-confidence diagnostic run including integration and E2E flows.",
    isDefault: false,
    maxTestCases: null,
    maxDurationMs: 120_000,
    parallelism: 4,
    depth: "deep",
    includeIntegration: true,
    includeE2E: true,
    includeLoad: false,
    includeExpensiveChecks: true,
    strictness: "strict",
  },
  stress: {
    id: "stress",
    label: "Stress / Load",
    description:
      "Focus on concurrency, load, and resilience under pressure. Used for performance testing.",
    isDefault: false,
    maxTestCases: 50,
    maxDurationMs: 180_000,
    parallelism: 8,
    depth: "standard",
    includeIntegration: true,
    includeE2E: false,
    includeLoad: true,
    includeExpensiveChecks: false,
    strictness: "lenient",
  },
  regression: {
    id: "regression",
    label: "Regression Suite",
    description:
      "Larger curated test set to protect against regressions for critical flows.",
    isDefault: false,
    maxTestCases: null,
    maxDurationMs: 300_000,
    parallelism: 4,
    depth: "exhaustive",
    includeIntegration: true,
    includeE2E: true,
    includeLoad: false,
    includeExpensiveChecks: true,
    strictness: "paranoid",
  },
};

/**
 * Resolve a profile from user input (query/body/orchestrator).
 * Falls back to the default profile when unknown.
 */
export function resolveTesterProfile(
  input?: string | null
): TesterProfileConfig {
  const normalized = (input || "").trim().toLowerCase() as TesterProfileId;

  if (normalized && normalized in TESTER_PROFILES) {
    return TESTER_PROFILES[normalized];
  }

  // fallback to default
  const fallback =
    Object.values(TESTER_PROFILES).find((p) => p.isDefault) ??
    TESTER_PROFILES.base;

  return fallback;
}
