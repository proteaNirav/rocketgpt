/**
 * RocketGPT Orchestrator – Global Safe-Mode Module
 * PhaseB StepB7 – Core guard used by orchestrator endpoints.
 */

export interface SafeModeState {
  enabled: boolean;
  reason?: string;
  enforced_at?: string;
}


function isEnvSafeModeOn(): boolean {
  const a = (process.env.RGPT_SAFE_MODE_ENABLED ?? "").toLowerCase();
  const b = (process.env.RGPT_SAFE_MODE ?? "").toLowerCase();
  return a === "true" || b === "on";
}
// In-memory Safe-Mode state (can be externalised later)
let _safeMode: SafeModeState = {
  enabled: false,
  reason: undefined,
  enforced_at: undefined,
};

export function getSafeMode(): SafeModeState {
  return { ..._safeMode };
}

export function enableSafeMode(reason?: string) {
  _safeMode.enabled = true;
  _safeMode.reason = reason ?? "Safe-Mode enabled by administrator.";
  _safeMode.enforced_at = new Date().toISOString();
}

export function disableSafeMode() {
  _safeMode.enabled = false;
  _safeMode.reason = undefined;
  _safeMode.enforced_at = undefined;
}

/**
 * Safe-Mode guard.
 * - If Safe-Mode is enabled, throws a structured error object.
 * - Callers should catch this and convert to HTTP 503 (or similar).
 */
export function safeModeGuard(capability: string): void {
  if (_safeMode.enabled || isEnvSafeModeOn()) {
    const error: any = {
      success: false,
      error_code: "SAFE_MODE_ACTIVE",
      message: `Orchestrator Safe-Mode is active. Capability '${capability}' is temporarily disabled.`,
      capability,
      safe_mode: true,
      timestamp: new Date().toISOString(),
      details: {
        reason: _safeMode.reason,
        enforced_at: _safeMode.enforced_at,
      },
      status: 503,
    };

    throw error;
  }
}

