import type { ApprovalCategory, ApprovalPacket } from "./types";
import { approvalStore } from "./store/inmemory-store";

/**
 * Rebuild the deterministic key used by evaluator.ts
 * (must stay in sync with buildStoreKey in evaluator.ts).
 */
function buildStoreKey(runId: string, step: number, category: ApprovalCategory) {
  return `${runId}:${step}:${category}`;
}

/**
 * Return all approvals currently in memory (across all runs).
 * Primarily for diagnostics / admin views.
 */
export function getAllApprovals(): ApprovalPacket[] {
  return approvalStore.getAll<ApprovalPacket>();
}

/**
 * Return all approvals for a given runId, sorted by (step, category).
 */
export function getApprovalsForRun(runId: string): ApprovalPacket[] {
  const all = approvalStore.getAll<ApprovalPacket>();
  return all
    .filter((p) => p.runId === runId)
    .sort((a, b) => {
      if (a.step !== b.step) return a.step - b.step;
      return a.category.localeCompare(b.category);
    });
}

/**
 * Get a single approval by (runId, step, category),
 * or null if none exists in memory.
 */
export function getApprovalForStep(
  runId: string,
  step: number,
  category: ApprovalCategory
): ApprovalPacket | null {
  const key = buildStoreKey(runId, step, category);
  return approvalStore.get<ApprovalPacket>(key);
}
