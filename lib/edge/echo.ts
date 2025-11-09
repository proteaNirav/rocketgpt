import type { NextRequest } from "next/server";

/**
 * Echoes back useful request bits for quick diagnostics:
 * - query: URLSearchParams as a plain object
 * - method: HTTP method
 * - json: parsed JSON body (POST/PUT/PATCH), if any
 * - headers: a few selected headers
 */
export default async function echo(req: NextRequest) {
  const url = new URL(req.url);

  // Query params -> plain object
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => (query[k] = v));

  // Try parse JSON body (ignore errors for GET)
  let json: unknown = null;
  if (req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
    try { json = await req.json(); } catch { /* ignore */ }
  }

  // Select a few headers for visibility
  const headers: Record<string, string | null> = {
    "content-type": req.headers.get("content-type"),
    "user-agent": req.headers.get("user-agent"),
  };

  return {
    method: req.method,
    query,
    json,
    headers,
  };
}
