const fs = require("fs");
const path = require("path");

const LEDGER_PATH = "docs/ops/ledgers/runtime/DISPATCH_GUARD.jsonl";

function appendJsonl(relPathFromRepoRoot, obj) {
  try {
    const repoRoot = process.cwd();
    const full = path.join(repoRoot, relPathFromRepoRoot);
    const line = JSON.stringify(obj) + "\n";
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.appendFileSync(full, line, { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

const DENY = {
  CAT_INACTIVE: "CAT is inactive",
  CAT_QUARANTINED: "CAT is quarantined",
  CAT_ROGUE: "CAT is rogue",
  PROVIDER_NOT_ALLOWED: "Provider not allowed for this CAT/org policy",
  BUDGET_EXCEEDED: "Budget exceeded",
  POLICY_SNAPSHOT_INVALID: "Policy snapshot invalid"
};

function deny(reason_code, message, input) {
  const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "DENY", deny_reason_code: reason_code });
  return { verdict: "DENY", http_status: 403, reason_code, message, actions: [], ledger_written };
}

function allow(input) {
  const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "ALLOW", deny_reason_code: null });
  return { verdict: "ALLOW", http_status: 200, reason_code: null, message: "Allowed", actions: [], ledger_written };
}

function evaluateDispatchGuard(input) {
  if (input.cat_status === "inactive") return deny("CAT_INACTIVE", DENY.CAT_INACTIVE, input);
  if (input.cat_status === "quarantined") return deny("CAT_QUARANTINED", DENY.CAT_QUARANTINED, input);
  if (input.cat_status === "rogue") return deny("CAT_ROGUE", DENY.CAT_ROGUE, input);

  if ((input.policy_version && !input.policy_hash) || (!input.policy_version && input.policy_hash)) {
    return deny("POLICY_SNAPSHOT_INVALID", DENY.POLICY_SNAPSHOT_INVALID, input);
  }

  const allowed = new Set((input.cat_allowed_providers || []).map(x => String(x).toLowerCase()));
  const req = String(input.provider_requested || "").toLowerCase();
  if (!req || !allowed.has(req)) return deny("PROVIDER_NOT_ALLOWED", DENY.PROVIDER_NOT_ALLOWED, input);

  if (typeof input.token_estimate === "number" && typeof input.max_tokens === "number") {
    if (input.token_estimate > input.max_tokens) return deny("BUDGET_EXCEEDED", DENY.BUDGET_EXCEEDED, input);
  }

  return allow(input);
}

module.exports = { evaluateDispatchGuard };
