export type TesterProfileId =
  | "base"
  | "light"
  | "full"
  | "stress"
  | "regression";

export type TesterProfile = {
  id: TesterProfileId;
  label: string;
  strictness: "normal" | "strict" | "lenient" | "paranoid";
  depth: string;
  maxTestCases: number | null;
  maxDurationMs: number | null;
  parallelism: number | null;
};

/**
 * Legacy/config type used by some helpers:
 * profile definition without the id field.
 */
export type TesterProfileConfig = Omit<TesterProfile, "id">;

const TESTER_PROFILES: Record<TesterProfileId, TesterProfile> = {
  base: {
    id: "base",
    label: "Base Smoke",
    strictness: "normal",
    depth: "smoke",
    maxTestCases: 3,
    maxDurationMs: 10_000,
    parallelism: 2,
  },
  light: {
    id: "light",
    label: "Light Quick-Check",
    strictness: "normal",
    depth: "quick",
    maxTestCases: 10,
    maxDurationMs: 30_000,
    parallelism: 3,
  },
  full: {
    id: "full",
    label: "Full Diagnostic",
    strictness: "strict",
    depth: "deep",
    maxTestCases: null,
    maxDurationMs: 120_000,
    parallelism: 4,
  },
  stress: {
    id: "stress",
    label: "Stress / Load",
    strictness: "lenient",
    depth: "standard",
    maxTestCases: 50,
    maxDurationMs: 180_000,
    parallelism: 8,
  },
  regression: {
    id: "regression",
    label: "Regression Suite",
    strictness: "paranoid",
    depth: "exhaustive",
    maxTestCases: null,
    maxDurationMs: 300_000,
    parallelism: 4,
  },
};

export function getTesterProfile(id?: string | null): TesterProfile {
  const key = (id as TesterProfileId) ?? "base";
  if (key in TESTER_PROFILES) {
    return TESTER_PROFILES[key];
  }
  return TESTER_PROFILES.base;
}

export { TESTER_PROFILES };
