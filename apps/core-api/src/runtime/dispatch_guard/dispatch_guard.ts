import { appendJsonl } from "./ledger";
import { DENY, CHALLENGE } from "./reason_codes";
import type { DispatchGuardInput, DispatchGuardResult } from "./contract";

const LEDGER_PATH = "docs/ops/ledgers/runtime/DISPATCH_GUARD.jsonl";

function deny(reason_code: string, message: string, input: DispatchGuardInput): DispatchGuardResult {
  const ledger_written = appendJsonl(LEDGER_PATH, {
    ...input,
    verdict: "DENY",
    deny_reason_code: reason_code
  });

  return {
    verdict: "DENY",
    http_status: 403,
    reason_code: reason_code as any,
    message,
    actions: [],
    ledger_written
  };
}

function challenge(reason_code: string, message: string, input: DispatchGuardInput): DispatchGuardResult {
  const ledger_written = appendJsonl(LEDGER_PATH, {
    ...input,
    verdict: "CHALLENGE",
    deny_reason_code: reason_code
  });

  return {
    verdict: "CHALLENGE",
    http_status: 401,
    reason_code: reason_code as any,
    message,
    actions: [],
    ledger_written
  };
}

function allow(input: DispatchGuardInput): DispatchGuardResult {
  const ledger_written = appendJsonl(LEDGER_PATH, {
    ...input,
    verdict: "ALLOW",
    deny_reason_code: null
  });

  return {
    verdict: "ALLOW",
    http_status: 200,
    reason_code: null,
    message: "Allowed",
    actions: [],
    ledger_written
  };
}

/**
 * Phase-D v1 Dispatch-Guard:
 * - Enforces CAT status
 * - Enforces provider allowlist
 * - Enforces basic token budget
 */
export function evaluateDispatchGuard(input: DispatchGuardInput): DispatchGuardResult {
  // 1) CAT status gate
  if (input.cat_status === "inactive") return deny("CAT_INACTIVE", DENY.CAT_INACTIVE, input);
  if (input.cat_status === "quarantined") return deny("CAT_QUARANTINED", DENY.CAT_QUARANTINED, input);
  if (input.cat_status === "rogue") return deny("CAT_ROGUE", DENY.CAT_ROGUE, input);

  // 2) Policy snapshot sanity (optional but useful)
  if ((input.policy_version && !input.policy_hash) || (!input.policy_version && input.policy_hash)) {
    return deny("POLICY_SNAPSHOT_INVALID", DENY.POLICY_SNAPSHOT_INVALID, input);
  }

  // 3) Provider allowlist
  const allowed = new Set((input.cat_allowed_providers || []).map(x => String(x).toLowerCase()));
  const req = String(input.provider_requested || "").toLowerCase();
  if (!req || !allowed.has(req)) {
    return deny("PROVIDER_NOT_ALLOWED", DENY.PROVIDER_NOT_ALLOWED, input);
  }

  // 4) Budget (simple)
  if (typeof input.token_estimate === "number" && typeof input.max_tokens === "number") {
    if (input.token_estimate > input.max_tokens) {
      return deny("BUDGET_EXCEEDED", DENY.BUDGET_EXCEEDED, input);
    }
  }

  // 5) Optional challenge hooks (kept for later)
  // Example: if route/tool requires OTP etc.
  // return challenge("OTP_REQUIRED", CHALLENGE.OTP_REQUIRED, input);

  return allow(input);
}
