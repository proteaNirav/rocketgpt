/**
 * Next-side policy snapshot hash source for runtime enforcement.
 * Must match decision.policy_snapshot in DECISIONS.jsonl.
 */
export function getExpectedPolicySnapshotHash(): string {
  return process.env.RGPT_POLICY_SNAPSHOT_SHA256 ?? "";
}
