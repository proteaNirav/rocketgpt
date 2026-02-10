const { evaluateDispatchGuard } = require("./dispatch_guard.js");

const input = {
  ts: new Date().toISOString(),
  request_id: "req_smoke_003",
  org_id: "org_demo",
  user_id: "usr_demo",
  workflow_id: "wf_demo",

  cat_id: "cat_demo",
  cat_version: "v0.0.1",
  cat_status: "active",

  provider_requested: "gemini",
  cat_allowed_providers: ["openai","claude"],

  token_estimate: 1200,
  max_tokens: 2000,

  policy_version: "pv_demo",
  policy_hash: "sha256:demo"
};

const r = evaluateDispatchGuard(input);
console.log("DispatchGuardResult:", r);
