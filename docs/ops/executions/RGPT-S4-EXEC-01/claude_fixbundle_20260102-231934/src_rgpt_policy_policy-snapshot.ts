/**
 * Policy Snapshot Provider (RGPT-S4)
 *
 * Goal: Single source of truth for the "expected" policy snapshot hash.
 * Runtime Guard and CI must both use this value when verifying decisions.
 *
 * Implementation Note:
 * - For now we read from env: RGPT_POLICY_SNAPSHOT_SHA256
 * - In later steps we can compute it from the canonical policy file(s)
 */
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function getExpectedPolicySnapshotHash(): string {
  const v = process.env.RGPT_POLICY_SNAPSHOT_SHA256;
  if (!isNonEmptyString(v)) return "";
  return v.trim();
}
