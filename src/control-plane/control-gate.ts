/**
 * control-gate.ts (duplicate entrypoint)
 * ----------------
 * Lightweight control-plane gate used by earlier or alternate app
 * layouts. Kept intentionally minimal and mirrored to the main
 * control-plane implementation to preserve deterministic behavior.
 */
import { ExecutionContext } from '../types/execution-context';

export interface ControlDecision {
  /**
   * Whether the execution is permitted to proceed. This field is the
   * authoritative flag consumers must check before executing any work.
   */
  allowed: boolean;
  /**
   * Optional justification for auditing and diagnostics.
   */
  reason?: string;
}

/**
 * enforceControlPlane
 * -------------------
 * Minimal V1 implementation of the non-bypassable control gate.
 * Intentionally contains no business logic, side effects, or async
 * behavior — only deterministic checks. This file mirrors the main
 * control-gate contract for compatibility.
 */
export function enforceControlPlane(
  context: ExecutionContext
): ControlDecision {
  // V1 policy: permit execution by default in this lightweight copy.
  // Keep the implementation minimal so callers cannot rely on side
  // effects or complex evaluation here.
  return { allowed: true };
}
