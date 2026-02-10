const fs = require("fs");
const path = require("path");

function readJson(rel) {
  const full = path.join(process.cwd(), rel);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}
function appendJsonl(rel, obj) {
  const full = path.join(process.cwd(), rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.appendFileSync(full, JSON.stringify(obj) + "\n", "utf8");
  return true;
}

const ACTIVE_PTR = "docs/runtime/policies/active.json";
const POLICY_DIR = "docs/runtime/policies";
const LEDGER_PATH = "docs/ops/ledgers/runtime/POLICY_GATE.jsonl";

function effectivePolicy(pol, org_id, cat_id) {
  const eff = { ...(pol.defaults || {}) };
  const orgOv = pol.overrides?.org?.[org_id];
  if (orgOv) Object.assign(eff, orgOv);
  const catOv = pol.overrides?.cat?.[cat_id];
  if (catOv) Object.assign(eff, catOv);
  return eff;
}

function evaluatePolicyGate(input) {
  let active, pol;
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

  const allowedProviders = new Set((eff.allowed_providers || []).map(x => String(x).toLowerCase()));
  const reqProvider = String(input.provider_requested || "").toLowerCase();
  if (!reqProvider || !allowedProviders.has(reqProvider)) {
    const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "DENY", policy_version, rule_id: "R1_PROVIDER_ALLOWED" });
    return { verdict: "DENY", http_status: 403, policy_version, rule_id: "R1_PROVIDER_ALLOWED", message: "Requested provider is not allowed by active policy.", actions: [], ledger_written };
  }

  if (typeof input.token_estimate === "number" && typeof eff.max_tokens_per_request === "number") {
    if (input.token_estimate > eff.max_tokens_per_request) {
      const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "DENY", policy_version, rule_id: "R2_MAX_TOKENS" });
      return { verdict: "DENY", http_status: 403, policy_version, rule_id: "R2_MAX_TOKENS", message: "Token estimate exceeds active policy max_tokens_per_request.", actions: [], ledger_written };
    }
  }

  if (Array.isArray(input.tool_intents) && input.tool_intents.length > 0) {
    const allowedTools = new Set((eff.allowed_tool_intents || []).map(x => String(x).toLowerCase()));
    for (const t of input.tool_intents) {
      if (!allowedTools.has(String(t).toLowerCase())) {
        const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "DENY", policy_version, rule_id: "R3_TOOL_INTENTS" });
        return { verdict: "DENY", http_status: 403, policy_version, rule_id: "R3_TOOL_INTENTS", message: "Tool intent is not allowed by active policy.", actions: [], ledger_written };
      }
    }
  }

  const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "ALLOW", policy_version, rule_id: null });
  return { verdict: "ALLOW", http_status: 200, policy_version, rule_id: null, message: "Allowed by policy", actions: [], ledger_written };
}

// Test 1: ALLOW (cat_demo allows openai, org_demo allows openai/claude)
const allowInput = {
  ts: new Date().toISOString(),
  request_id: "req_pg_001",
  org_id: "org_demo",
  user_id: "usr_demo",
  cat_id: "cat_demo",
  provider_requested: "openai",
  token_estimate: 1500,
  tool_intents: ["read"]
};
console.log("ALLOW result:", evaluatePolicyGate(allowInput));

// Test 2: DENY provider (cat_demo only allows openai)
const denyInput = {
  ts: new Date().toISOString(),
  request_id: "req_pg_002",
  org_id: "org_demo",
  user_id: "usr_demo",
  cat_id: "cat_demo",
  provider_requested: "claude",
  token_estimate: 1500,
  tool_intents: ["read"]
};
console.log("DENY result:", evaluatePolicyGate(denyInput));

console.log("\n== Tail POLICY_GATE ledger (last 3 lines) ==");
const lines = fs.readFileSync(path.join(process.cwd(), LEDGER_PATH), "utf8").trim().split("\n");
console.log(lines.slice(-3).join("\n"));
