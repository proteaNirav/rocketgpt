import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Central CORS for Edge endpoints
 * - Handles OPTIONS preflight
 * - Adds CORS headers on all responses
 * - Passthrough of Authorization and common auth headers
 *
 * Scope: /api/edge/*
 */

const ALLOW_ORIGIN = "*"; // Phase 1: permissive; tighten in Phase 2
const ALLOW_METHODS = "GET,POST,OPTIONS";
const ALLOW_HEADERS = "Content-Type, Authorization";
const MAX_AGE = "600";

function applyCorsHeaders(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.headers.set("Access-Control-Allow-Methods", ALLOW_METHODS);
  res.headers.set("Access-Control-Allow-Headers", ALLOW_HEADERS);
  res.headers.set("Access-Control-Max-Age", MAX_AGE);
  return res;
}

export async function middleware(req: NextRequest) {
  // Preflight
  if (req.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(preflight);
  }

  // Forward auth-related headers (optional; explicit in case upstream requires)
  const fwd = new Headers(req.headers);
  // (No mutation needed for Authorization; kept to signal intent)
  // fwd.set("Authorization", req.headers.get("Authorization") ?? "");

  const res = NextResponse.next({
    request: { headers: fwd },
  });

  return applyCorsHeaders(res);
}

/** Limit this middleware to Edge API paths only */
export const config = {
  matcher: ["/api/edge/:path*"],
};
