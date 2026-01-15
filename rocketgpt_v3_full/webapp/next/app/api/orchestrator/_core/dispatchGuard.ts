import crypto from "crypto";
import { NextRequest } from "next/server";

// Hardening utilities for orchestrator "dispatch-style" routes that proxy to internal endpoints.

const MAX_RUN_ID_LEN = 80;
const SAFE_RUN_ID_RE = /^[a-zA-Z0-9._:-]{6,80}$/;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && Object.getPrototypeOf(x) === Object.prototype;
}

// Remove keys that can enable prototype pollution; also strip non-plain objects.
export function sanitizeJson(input: unknown): Record<string, unknown> {
  if (!isPlainObject(input)) return {};

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;

    if (isPlainObject(v)) out[k] = sanitizeJson(v);
    else if (Array.isArray(v)) out[k] = v.map((item) => (isPlainObject(item) ? sanitizeJson(item) : item));
    else out[k] = v;
  }
  return out;
}

export async function safeParseJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const raw = await req.json();
    return sanitizeJson(raw);
  } catch {
    return {};
  }
}

export function pickRunId(req: NextRequest, body: Record<string, unknown>): string {
  const url = new URL(req.url);
  const headerRunId = req.headers.get("x-rgpt-run-id") ?? undefined;
  const queryRunId = url.searchParams.get("run_id") ?? undefined;

  const bodyRunId =
    (typeof (body as any).run_id === "string" && (body as any).run_id) ||
    (typeof (body as any).runId === "string" && (body as any).runId) ||
    undefined;

  const candidate = headerRunId ?? queryRunId ?? bodyRunId ?? "";
  const trimmed = String(candidate).trim();

  // Accept only safe ids; otherwise generate a new UUID.
  if (!trimmed) return crypto.randomUUID();
  if (trimmed.length > MAX_RUN_ID_LEN) return crypto.randomUUID();
  if (!SAFE_RUN_ID_RE.test(trimmed)) return crypto.randomUUID();
  return trimmed;
}

export function buildProxyBody(body: Record<string, unknown>, runId: string): Record<string, unknown> {
  // Force run_id; remove runId alias to prevent ambiguity downstream.
  const { runId: _dropRunId, ...rest } = body as any;
  return { ...rest, run_id: runId };
}