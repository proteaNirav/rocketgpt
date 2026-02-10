const fs = require("fs");
const path = require("path");

const LEDGER = "docs/ops/ledgers/runtime/EXECUTION_GUARD.jsonl";

function append(obj) {
  const full = path.join(process.cwd(), LEDGER);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.appendFileSync(full, JSON.stringify(obj) + "\n", "utf8");
}

function evaluate(signal, cfg) {
  // Tool drift
  if (cfg.tool_intent_fail_closed) {
    const planned = new Set((signal.tool_intents || []).map(x => String(x).toLowerCase()));
    const observed = new Set((signal.tool_intents_observed || []).map(x => String(x).toLowerCase()));
    for (const x of observed) {
      if (!planned.has(x)) {
        const out = { ...signal, action: "ABORT", reason: `Tool intent drift detected: observed '${x}' not in planned intents` };
        append(out); return out;
      }
    }
  }

  // Latency
  if (typeof signal.latency_ms === "number") {
    if (signal.latency_ms >= cfg.latency_abort_ms) {
      const out = { ...signal, action: "ABORT", reason: `Latency breach: ${signal.latency_ms}ms >= ${cfg.latency_abort_ms}ms` };
      append(out); return out;
    }
    if (signal.latency_ms >= cfg.latency_warn_ms) {
      const out = { ...signal, action: "WARN", reason: `Latency warning: ${signal.latency_ms}ms >= ${cfg.latency_warn_ms}ms` };
      append(out); return out;
    }
  }

  // Token drift
  if (typeof signal.tokens_used === "number" && typeof signal.token_estimate === "number" && signal.token_estimate > 0) {
    const warnAt = signal.token_estimate * cfg.token_drift_factor_warn;
    const abortAt = signal.token_estimate * cfg.token_drift_factor_abort;

    if (signal.tokens_used > abortAt) {
      const out = { ...signal, action: "ABORT", reason: `Token drift breach: ${signal.tokens_used} > ${abortAt.toFixed(0)} (estimate ${signal.token_estimate})` };
      append(out); return out;
    }
    if (signal.tokens_used > warnAt) {
      const out = { ...signal, action: "WARN", reason: `Token drift warning: ${signal.tokens_used} > ${warnAt.toFixed(0)} (estimate ${signal.token_estimate})` };
      append(out); return out;
    }
  }

  const out = { ...signal, action: "CONTINUE", reason: "Within limits" };
  append(out); return out;
}

const cfg = {
  token_drift_factor_warn: 1.25,
  token_drift_factor_abort: 1.75,
  latency_warn_ms: 8000,
  latency_abort_ms: 20000,
  tool_intent_fail_closed: true
};

const base = {
  ts: new Date().toISOString(),
  execution_id: "exec_001",
  request_id: "req_eg_001",
  org_id: "org_demo",
  user_id: "usr_demo",
  cat_id: "cat_demo",
  provider: "openai",
  token_estimate: 1000,
  tool_intents: ["read"]
};

console.log("CONTINUE:", evaluate({ ...base, tokens_used: 900, latency_ms: 2000, tool_intents_observed: ["read"] }, cfg));
console.log("WARN(token):", evaluate({ ...base, execution_id:"exec_002", request_id:"req_eg_002", tokens_used: 1400, latency_ms: 2000, tool_intents_observed: ["read"] }, cfg));
console.log("ABORT(tool):", evaluate({ ...base, execution_id:"exec_003", request_id:"req_eg_003", tokens_used: 900, latency_ms: 2000, tool_intents_observed: ["write"] }, cfg));

console.log("\n== Tail EXECUTION_GUARD ledger (last 3 lines) ==");
const lines = fs.readFileSync(path.join(process.cwd(), LEDGER), "utf8").trim().split("\n");
console.log(lines.slice(-3).join("\n"));
