/* =========================================================
 * RGPT-S4 — Runtime Guard (Decision Ledger Enforcement)
 * FAIL-CLOSED BY DESIGN
 * ========================================================= */
import { loadDecisionById, verifyDecision } from "../ledger/decision-ledger";
import { getExpectedPolicySnapshotHash } from "../policy/policy-snapshot";

export interface RuntimeDecisionContext {
  decision_id: string;
}

export async function enforceRuntimeDecision(
  ctx: RuntimeDecisionContext
): Promise<void> {
  if (!ctx || !ctx.decision_id) {
    throw new Error("RGPT_GUARD_BLOCK: MISSING_DECISION_ID");
  }

  const expectedPolicyHash = getExpectedPolicySnapshotHash();
  if (!expectedPolicyHash) {
    throw new Error("RGPT_GUARD_BLOCK: MISSING_POLICY_SNAPSHOT_HASH");
  }

  const decision = await loadDecisionById(ctx.decision_id);
  const result = verifyDecision(decision, expectedPolicyHash);

  if (!result.ok) {
    throw new Error(`RGPT_GUARD_BLOCK: ${result.reason}`);
  }

  // Decision is approved and valid — execution may proceed
}
