export type BuilderTrustTier =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6;

export const BUILDER_TRUST_TIER_LABELS: Record<BuilderTrustTier, string> = {
  0: "untrusted-experimental",
  1: "restricted-external",
  2: "validated-external",
  3: "trusted-external",
  4: "candidate-internal",
  5: "internal-trusted",
  6: "internal-core",
};
