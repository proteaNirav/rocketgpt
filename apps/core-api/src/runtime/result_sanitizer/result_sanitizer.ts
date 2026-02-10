import type { ResultSanitizerInput, ResultSanitizerResult } from "./contract";
import { appendJsonl } from "./ledger";

const LEDGER_PATH = "docs/ops/ledgers/runtime/RESULT_SANITIZER.jsonl";

const RE_BEARER = /\bBearer\s+[A-Za-z0-9\-\._~\+\/]+=*\b/g;
const RE_API_KEY = /\b(sk|rk|pk)_[A-Za-z0-9]{16,}\b/g; // generic key-ish
const RE_INTERNAL_URL = /\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|[A-Za-z0-9\-]+\.(?:internal|local))(?::\d+)?[^\s]*\b/gi;

const RE_EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RE_PHONE = /\b(\+?\d{1,3}[\s-]?)?(\(?\d{3,5}\)?[\s-]?)?\d{3}[\s-]?\d{3,4}\b/g;

function maskEmail(s: string) {
  return s.replace(RE_EMAIL, (m) => {
    const [u, d] = m.split("@");
    const u2 = u.length <= 2 ? "*".repeat(u.length) : (u[0] + "*".repeat(u.length - 2) + u[u.length - 1]);
    return `${u2}@${d}`;
  });
}

function maskPhone(s: string) {
  return s.replace(RE_PHONE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 8) return m;
    const keep = digits.slice(-4);
    return m.replace(/\d/g, "X").replace(/X{4}$/, keep);
  });
}

export function sanitizeResult(input: ResultSanitizerInput): ResultSanitizerResult {
  const redactions: string[] = [];
  let out = String(input.output_text ?? "");

  // 1) Secrets & internal URLs (always sanitize)
  const before1 = out;
  out = out.replace(RE_BEARER, "[REDACTED_BEARER_TOKEN]");
  if (out !== before1) redactions.push("bearer_token");

  const before2 = out;
  out = out.replace(RE_API_KEY, "[REDACTED_API_KEY]");
  if (out !== before2) redactions.push("api_key");

  const before3 = out;
  out = out.replace(RE_INTERNAL_URL, "[REDACTED_INTERNAL_URL]");
  if (out !== before3) redactions.push("internal_url");

  // 2) PII handling
  const pii_mode = input.pii_mode ?? "off";
  if (pii_mode === "block") {
    if (RE_EMAIL.test(out) || RE_PHONE.test(out)) {
      const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict: "BLOCK", redactions: ["pii_blocked"] });
      return {
        verdict: "BLOCK",
        message: "Output blocked due to PII policy (pii_mode=block).",
        output_text: "Blocked by policy.",
        redactions: ["pii_blocked"],
        ledger_written
      };
    }
  }

  if (pii_mode === "redact") {
    const b = out;
    out = maskEmail(out);
    out = maskPhone(out);
    if (out !== b) redactions.push("pii_redacted");
  }

  // 3) Safe-mode tightening (optional): if safe_mode true, ensure at least secret patterns are redacted (already done)
  const verdict = redactions.length === 0 ? "PASS" : "SANITIZED";
  const ledger_written = appendJsonl(LEDGER_PATH, { ...input, verdict, redactions });

  return {
    verdict: verdict as any,
    message: verdict === "PASS" ? "No sanitization needed." : "Sanitized output.",
    output_text: out,
    redactions,
    ledger_written
  };
}
