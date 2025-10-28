import { RateLimitError, RateLimitPayload } from "@/lib/errors";

export async function callEdge(fn: string, payload?: unknown, init?: RequestInit) {
  const res = await fetch(`/api/edge/${fn}`, {
    method: init?.method ?? "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });

  if (res.status === 429) {
    const j = (await res.json().catch(() => ({}))) as RateLimitPayload;
    const retryAfter = Number(res.headers.get("Retry-After") || j?.retry_after_seconds || 60);
    throw new RateLimitError("RATE_LIMITED", j, retryAfter);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Edge proxy error ${res.status}: ${text}`);
  }

  return res.json();
}
