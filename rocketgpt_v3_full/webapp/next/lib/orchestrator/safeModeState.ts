/**
 * RocketGPT Orchestrator – Safe-Mode State (single source of truth)
 * ---------------------------------------------------------------
 * This module exposes Safe-Mode state for UI/status routes.
 * IMPORTANT: Safe-Mode must be deterministic and consistent across routes.
 *
 * Source of truth:
 *  - env RGPT_SAFE_MODE_ENABLED === "true"  OR
 *  - env RGPT_SAFE_MODE === "on"
 *
 * Note: setSafeModeEnabled() is kept for backward compatibility,
 * but env still takes precedence to avoid drift in distributed runtimes.
 */

let safeModeEnabled = false;

function envSafeModeEnabled(): boolean {
  const a = (process.env.RGPT_SAFE_MODE_ENABLED || "").toLowerCase();
  const b = (process.env.RGPT_SAFE_MODE || "").toLowerCase();
  return a === "true" || b === "on";
}

export function getSafeModeEnabled(): boolean {
  // Env wins to prevent UI/status drift from real enforcement.
  if (envSafeModeEnabled()) return true;
  return safeModeEnabled;
}

export function setSafeModeEnabled(enabled: boolean): void {
  safeModeEnabled = enabled;
}
