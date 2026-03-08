export const EXPERIENCE_SOURCE_COMPONENT = "mesh-live-runtime" as const;

export const EXPERIENCE_TAGS = {
  CAPTURED: "cel.captured",
  GUARDED: "cel.guarded",
  FAILED: "cel.failed",
  FALLBACK: "cel.fallback",
  VERIFIED: "cel.verified",
} as const;

export const EXPERIENCE_LIMITS = {
  DEFAULT_RECENT_LIMIT: 20,
  MAX_IN_MEMORY_RECORDS: 1000,
} as const;

