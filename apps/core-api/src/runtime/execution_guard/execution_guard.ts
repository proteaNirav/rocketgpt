import type { ExecutionGuardResult, ExecutionGuardSignal } from "./contract";
import { appendJsonl } from "./ledger";

const LEDGER_PATH = "docs/ops/ledgers/runtime/EXECUTION_GUARD.jsonl";

/**
 * Phase-D v1 parameters (keep simple and predictable):
 * - token_drift_factor: if tokens_used > token_estimate * factor => WARN/ABORT
 * - latency_warn_ms / latency_abort_ms
 */
export type ExecutionGuardConfig = {
  token_drift_factor_warn: number;  // e.g., 1.25
  token_drift_factor_abort: number; // e.g., 1.75
  latency_warn_ms: number;          // e.g., 8000
  latency_abort_ms: number;         // e.g., 20000
  tool_intent_fail_closed: boolean; // if observed has items not planned
};

export const DEFAULT_EXEC_GUARD_CONFIG: ExecutionGuardConfig = {
  token_drift_factor_warn: 1.25,
  token_drift_factor_abort: 1.75,
  latency_warn_ms: 8000,
  latency_abort_ms: 20000,
  tool_intent_fail_closed: true
};

function write(signal: ExecutionGuardSignal, action: ExecutionGuardResult["action"], reason: string): ExecutionGuardResult {
  const ledger_written = appendJsonl(LEDGER_PATH, { ...signal, action, reason });
  return { action, reason, ledger_written };
}

function setOfLower(xs?: string[] | null): Set<string> {
  return new Set((xs || []).map(x => String(x).toLowerCase()));
}

export function evaluateExecutionGuard(
  signal: ExecutionGuardSignal,
  cfg: ExecutionGuardConfig = DEFAULT_EXEC_GUARD_CONFIG
): ExecutionGuardResult {

  // 1) Tool intent drift (fail-closed option)
  if (cfg.tool_intent_fail_closed) {
    const planned = setOfLower(signal.tool_intents || []);
    const observed = setOfLower(signal.tool_intents_observed || []);
    for (const x of observed) {
      if (!planned.has(x)) {
        return write(signal, "ABORT", `Tool intent drift detected: observed '${x}' not in planned intents`);
      }
    }
  }

  // 2) Latency enforcement
  if (typeof signal.latency_ms === "number") {
    if (signal.latency_ms >= cfg.latency_abort_ms) {
      return write(signal, "ABORT", `Latency breach: ${signal.latency_ms}ms >= ${cfg.latency_abort_ms}ms`);
    }
    if (signal.latency_ms >= cfg.latency_warn_ms) {
      return write(signal, "WARN", `Latency warning: ${signal.latency_ms}ms >= ${cfg.latency_warn_ms}ms`);
    }
  }

  // 3) Token drift enforcement
  if (typeof signal.tokens_used === "number" && typeof signal.token_estimate === "number" && signal.token_estimate > 0) {
    const warnAt = signal.token_estimate * cfg.token_drift_factor_warn;
    const abortAt = signal.token_estimate * cfg.token_drift_factor_abort;

    if (signal.tokens_used > abortAt) {
      return write(signal, "ABORT", `Token drift breach: ${signal.tokens_used} > ${abortAt.toFixed(0)} (estimate ${signal.token_estimate})`);
    }
    if (signal.tokens_used > warnAt) {
      return write(signal, "WARN", `Token drift warning: ${signal.tokens_used} > ${warnAt.toFixed(0)} (estimate ${signal.token_estimate})`);
    }
  }

  return write(signal, "CONTINUE", "Within limits");
}
