import {
  ApprovalInput,
  ApprovalPacket,
  computeSuggestedAction,
  normalizeApprovalPacket,
  assertValidApprovalPacket,
} from './types'
import { evaluateRules } from './rules/rule-engine'
import { approvalStore } from './store/inmemory-store'

/**
 * Derive a deterministic key for storing approvals.
 * This allows querying all decisions per run/step/category.
 */
function buildStoreKey(packet: ApprovalPacket): string {
  return `${packet.runId}:${packet.step}:${packet.category}`
}

/**
 * Main entry point for V9 Approvals Engine.
 *
 * Responsibilities:
 *  - Accept a flexible ApprovalInput from Planner/Builder/Tester/etc.
 *  - Normalize it into a strict ApprovalPacket.
 *  - Apply deterministic rules to compute risk, reasons, hints.
 *  - Derive suggestedAction from risk (unless already explicitly chosen).
 *  - Validate the final packet (assertValidApprovalPacket).
 *  - Persist decision in the in-memory store for later retrieval.
 */
export async function evaluateApproval(input: ApprovalInput): Promise<ApprovalPacket> {
  // 1) Normalize loose input into a well-formed packet
  const basePacket = normalizeApprovalPacket(input)

  // 2) Validate structure early – will throw if invalid
  assertValidApprovalPacket(basePacket)

  // 3) Apply deterministic rules
  const ruleResult = evaluateRules(basePacket)

  // 4) Merge rule result into packet
  const mergedRisk = ruleResult.risk
  const mergedReasons = ruleResult.reasons
  const mergedHints = ruleResult.hints

  // 5) Derive suggestedAction from merged risk
  const mergedSuggestedAction = computeSuggestedAction(mergedRisk)

  // 6) Ensure requiresHuman is coherent with final risk
  const requiresHuman =
    typeof basePacket.requiresHuman === 'boolean'
      ? basePacket.requiresHuman || mergedRisk === 'high'
      : mergedRisk === 'high'

  const finalPacket: ApprovalPacket = {
    ...basePacket,
    risk: mergedRisk,
    reasons: mergedReasons,
    hints: mergedHints,
    requiresHuman,
    suggestedAction: mergedSuggestedAction,
  }

  // 7) Final validation (defensive)
  assertValidApprovalPacket(finalPacket)

  // 8) Persist in in-memory store using deterministic key
  const key = buildStoreKey(finalPacket)
  approvalStore.save(key, finalPacket)

  // 9) Return final decision
  return finalPacket
}
