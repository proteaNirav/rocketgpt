import type { PolicyGateInput, PolicyGateResult } from "./contract";
import { readJson, appendJsonl } from "./io";

const ACTIVE_PTR = "docs/runtime/policies/active.json";
const POLICY_DIR = "docs/runtime/policies";
const LEDGER_PATH = "docs/ops/ledgers/runtime/POLICY_GATE.jsonl";

function deny(input: PolicyGateInput, policy_version: string, rule_id: string, message: string): PolicyGateResult {
  const ledger_written = appendJsonl(LEDGER_PATH, {
    ...input,
    verdict: "DENY",
    policy_version,
    rule_id
  });
  return { verdict: "DENY", http_status: 403, policy_version, rule_id, message, actions: [], ledger_written };
}

function allow(input: PolicyGateInput, policy_version: string): PolicyGateResult {
  const ledger_written = appendJsonl(LEDGER_PATH, {
    ...input,
    verdict: "ALLOW",
    policy_version,
    rule_id: null
  });
  return { verdict: "ALLOW", http_status: 200, policy_version, rule_id: null, message: "Allowed by policy", actions: [], ledger_written };
}

/**
 * Merge defaults -> org override -> cat override
 */
function effectivePolicy(base: any, org_id: string, cat_id: string): any {
  const eff = { ...base.defaults };

  const orgOv = base.overrides?.org?.[org_id];
  if (orgOv) Object.assign(eff, orgOv);

  const catOv = base.overrides?.cat?.[cat_id];
  if (catOv) Object.assign(eff, catOv);

  return eff;
}

export function evaluatePolicyGate(input: PolicyGateInput): PolicyGateResult {
  // Fail-closed on any read/parse errors
  let active: any;
  let pol: any;
  try {
    active = readJson(ACTIVE_PTR);
    const pv = String(active.active_policy_version || "");
    if (!pv) throw new Error("missing active_policy_version");
    pol = readJson(`${POLICY_DIR}/${pv}.json`);
  } catch {
    const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "DENY", policy_version: null, rule_id: "R0_FAIL_CLOSED" });
    return { verdict: "DENY", http_status: 503, policy_version: null, rule_id: "R0_FAIL_CLOSED", message: "Policy unavailable (fail-closed)", actions: [], ledger_written };
  }

  const policy_version = String(pol.policy_version || "unknown");
  const eff = effectivePolicy(pol, input.org_id, input.cat_id);

  // R1_PROVIDER_ALLOWED
  const allowedProviders = new Set((eff.allowed_providers || []).map((x: any) => String(x).toLowerCase()));
  const reqProvider = String(input.provider_requested || "").toLowerCase();
  if (!reqProvider || !allowedProviders.has(reqProvider)) {
    const msg = pol.rules?.find((r: any) => r.rule_id === "R1_PROVIDER_ALLOWED")?.message
      || "Requested provider is not allowed by active policy.";
    return deny(input, policy_version, "R1_PROVIDER_ALLOWED", msg);
  }

  // R2_MAX_TOKENS
  if (typeof input.token_estimate === "number" && typeof eff.max_tokens_per_request === "number") {
    if (input.token_estimate > eff.max_tokens_per_request) {
      const msg = pol.rules?.find((r: any) => r.rule_id === "R2_MAX_TOKENS")?.message
        || "Token estimate exceeds policy max.";
      return deny(input, policy_version, "R2_MAX_TOKENS", msg);
    }
  }

  // R3_TOOL_INTENTS
  if (Array.isArray(input.tool_intents) && input.tool_intents.length > 0) {
    const allowedTools = new Set((eff.allowed_tool_intents || []).map((x: any) => String(x).toLowerCase()));
    for (const t of input.tool_intents) {
      const tt = String(t).toLowerCase();
      if (!allowedTools.has(tt)) {
        const msg = pol.rules?.find((r: any) => r.rule_id === "R3_TOOL_INTENTS")?.message
          || "Tool intent is not allowed by policy.";
        return deny(input, policy_version, "R3_TOOL_INTENTS", msg);
      }
    }
  }

  return allow(input, policy_version);
}
