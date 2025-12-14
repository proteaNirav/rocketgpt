/**
 * control-gate.ts
 * ----------------
 * Central, deterministic gate for execution within the control plane.
 * This module provides the single authoritative decision shape and
 * the `enforceControlPlane` function which applies the Decision Contract
 * requirements in a non-bypassable, side-effect-free manner.
 */
import { ExecutionContext } from '../types/execution-context';

/**
 * ControlDecision
 * ----------------
 * Result of Control Plane evaluation.
 * This is the single authority that decides
 * whether an execution may proceed.
 */
export interface ControlDecision {
  /**
   * Whether the execution is permitted to proceed. Consumers must treat
   * this value as authoritative and enforce it before executing work.
   */
  allowed: boolean;
  /**
   * Optional human- or system-readable justification for the decision.
   * Useful for auditing and diagnostics; not required for enforcement.
   */
  reason?: string;
}

/**
 * enforceControlPlane
 * -------------------
 * Central, non-bypassable control gate for RocketGPT.
 *
 * Responsibilities:
 * - Enforce Decision Contract presence
 * - Act as the single execution authority
 * - Remain deterministic and auditable
 *
 * NOTE:
 * - No business logic here
 * - No side effects
 * - No async calls
 */
export function enforceControlPlane(
  context: ExecutionContext
): ControlDecision {

  // HARD enforcement: Decision Contract is mandatory.
  // The control plane requires an explicit DecisionContract to exist on
  // the execution context; absence is an immediate denial. This check is
  // intentionally strict and deterministic so it can be audited.
  if (!context.decisionContract) {
    return {
      allowed: false,
      reason: 'Missing DecisionContract'
    };
  }

  // V1 policy: permit execution when a Decision Contract is present.
  // This is a minimal, deterministic implementation for the initial
  // control-plane release. Future versions should evaluate the contract
  // contents to make finer-grained allow/deny decisions.
  return { allowed: true };
}
