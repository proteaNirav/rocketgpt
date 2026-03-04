import crypto from "crypto";

const SECRET_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /bearer/i,
  /auth/i,
  /credential/i,
];

function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function normalizeValue(input: unknown): unknown {
  if (input === null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map((value) => normalizeValue(value));

  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const keys = Object.keys(src).sort();
  for (const key of keys) {
    if (isSecretKey(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = normalizeValue(src[key]);
    }
  }
  return out;
}

export function redactSecrets(input: unknown): unknown {
  return normalizeValue(input);
}

function stableStringify(input: unknown): string {
  return JSON.stringify(normalizeValue(input));
}

export function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createParamsFingerprint(params: Record<string, unknown> | undefined): string {
  const normalized = params ?? {};
  return sha256Hex(stableStringify(normalized));
}

