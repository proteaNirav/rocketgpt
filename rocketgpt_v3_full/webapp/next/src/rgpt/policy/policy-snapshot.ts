/**
 * Next-side policy snapshot hash source for runtime enforcement.
 * Must match decision.policy_snapshot in DECISIONS.jsonl.
 */
export function getExpectedPolicySnapshotHash(): string {
  // Prefer explicit env var (local dev + CI). FAIL-CLOSED remains: empty => guard blocks.
  const envHash =
    (process.env.RGPT_POLICY_SNAPSHOT_HASH ?? process.env.NEXT_PUBLIC_RGPT_POLICY_SNAPSHOT_HASH ?? "").trim();
  if (envHash) return envHash;
return process.env.RGPT_POLICY_SNAPSHOT_SHA256 ?? "";
}

