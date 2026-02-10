const fs = require("fs");
const path = require("path");

const LEDGER = "docs/ops/ledgers/runtime/RESULT_SANITIZER.jsonl";

const RE_BEARER = /\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*\b/g;
const RE_API_KEY = /\b(sk|rk|pk)_[A-Za-z0-9]{16,}\b/g;
const RE_INTERNAL_URL = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[A-Za-z0-9\-]+\.(?:internal|local))(?::\d+)?[^\s]*\b/gi;

const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RE_PHONE = /\b(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/g;

function append(obj) {
  const full = path.join(process.cwd(), LEDGER);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.appendFileSync(full, JSON.stringify(obj) + "\n", "utf8");
  return true;
}

function maskEmail(s) {
  return s.replace(RE_EMAIL, (m) => {
    const [u, d] = m.split("@");
    const u2 = u.length <= 2 ? "*".repeat(u.length) : (u[0] + "*".repeat(u.length - 2) + u[u.length - 1]);
    return `${u2}@${d}`;
  });
}

function maskPhone(s) {
  return s.replace(RE_PHONE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 8) return m;
    const keep = digits.slice(-4);
    return m.replace(/\d/g, "X").replace(/X{4}$/, keep);
  });
}

function sanitize(input) {
  const redactions = [];
  let out = String(input.output_text || "");

  const b1 = out; out = out.replace(RE_BEARER, "[REDACTED_BEARER_TOKEN]"); if (out !== b1) redactions.push("bearer_token");
  const b2 = out; out = out.replace(RE_API_KEY, "[REDACTED_API_KEY]"); if (out !== b2) redactions.push("api_key");
  const b3 = out; out = out.replace(RE_INTERNAL_URL, "[REDACTED_INTERNAL_URL]"); if (out !== b3) redactions.push("internal_url");

  const pii = input.pii_mode || "off";
  if (pii === "block") {
    if (RE_EMAIL.test(out) || RE_PHONE.test(out)) {
      append({ ...input, verdict: "BLOCK", redactions: ["pii_blocked"] });
      return { verdict: "BLOCK", message: "Output blocked due to PII policy.", output_text: "Blocked by policy.", redactions: ["pii_blocked"] };
    }
  }
  if (pii === "redact") {
    const b = out;
    out = maskEmail(out);
    out = maskPhone(out);
    if (out !== b) redactions.push("pii_redacted");
  }

  const verdict = redactions.length ? "SANITIZED" : "PASS";
  append({ ...input, verdict, redactions });
  return { verdict, message: verdict === "PASS" ? "No sanitization needed." : "Sanitized output.", output_text: out, redactions };
}

const base = {
  ts: new Date().toISOString(),
  request_id: "req_rs_base",
  org_id: "org_demo",
  user_id: "usr_demo",
  cat_id: "cat_demo",
  provider: "openai",
  safe_mode: true,
  schema_required: false
};

console.log("PASS:", sanitize({ ...base, request_id:"req_rs_001", pii_mode:"off", output_text:"Hello world." }));
console.log("SANITIZED:", sanitize({ ...base, request_id:"req_rs_002", pii_mode:"off", output_text:"Token Bearer abcdefghijklmnop. Call http://localhost:8080/health and use sk_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234" }));
console.log("BLOCK:", sanitize({ ...base, request_id:"req_rs_003", pii_mode:"block", output_text:"Email me at test.user@example.com or call +91 98765 43210" }));

console.log("\n== Tail RESULT_SANITIZER ledger (last 3 lines) ==");
const lines = fs.readFileSync(path.join(process.cwd(), LEDGER), "utf8").trim().split("\n");
console.log(lines.slice(-3).join("\n"));
