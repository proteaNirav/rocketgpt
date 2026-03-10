import crypto from "crypto";

type RedactionResult = {
  sanitized: string;
  redactionCount: number;
  redactionKinds: string[];
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/g;
const API_KEY_RE = /\b(?:sk|rk|pk|ghp|pat|xoxb|xoxp|AIza)[-_A-Za-z0-9]{12,}\b/g;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*\b/gi;
const SECRET_ASSIGN_RE = /\b(?:password|passwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*[^\s"']+/gi;

function replaceAllWithCount(input: string, re: RegExp, replacement: string): { text: string; count: number } {
  const matches = input.match(re);
  return {
    text: input.replace(re, replacement),
    count: matches ? matches.length : 0,
  };
}

export function redactLearningText(raw: string): RedactionResult {
  let text = String(raw ?? "");
  let redactionCount = 0;
  const redactionKinds: string[] = [];

  const email = replaceAllWithCount(text, EMAIL_RE, "[REDACTED_EMAIL]");
  text = email.text;
  if (email.count > 0) {
    redactionCount += email.count;
    redactionKinds.push("email");
  }

  const phone = replaceAllWithCount(text, PHONE_RE, "[REDACTED_PHONE]");
  text = phone.text;
  if (phone.count > 0) {
    redactionCount += phone.count;
    redactionKinds.push("phone");
  }

  const key = replaceAllWithCount(text, API_KEY_RE, "[REDACTED_KEY]");
  text = key.text;
  if (key.count > 0) {
    redactionCount += key.count;
    redactionKinds.push("api_key");
  }

  const bearer = replaceAllWithCount(text, BEARER_RE, "[REDACTED_BEARER]");
  text = bearer.text;
  if (bearer.count > 0) {
    redactionCount += bearer.count;
    redactionKinds.push("bearer");
  }

  const secretAssign = replaceAllWithCount(text, SECRET_ASSIGN_RE, "[REDACTED_SECRET_ASSIGNMENT]");
  text = secretAssign.text;
  if (secretAssign.count > 0) {
    redactionCount += secretAssign.count;
    redactionKinds.push("secret_assignment");
  }

  return {
    sanitized: text,
    redactionCount,
    redactionKinds: [...new Set(redactionKinds)],
  };
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
