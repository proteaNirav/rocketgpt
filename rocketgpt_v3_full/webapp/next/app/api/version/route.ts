import { NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export const runtime = "nodejs";



function hasDecisionId(request: Request): boolean {
  try {
    const h = request.headers;
    const v = h.get("x-rgpt-decision-id") || h.get("X-RGPT-Decision-Id") || "";
    return String(v).trim().length > 0;
  } catch {
    return false;
  }
}

function toSafeError(err: any) {
  const msg = (err && (err.message || String(err))) || "unknown error";
  const name = (err && err.name) || "Error";
  const stack = (err && err.stack) ? String(err.stack) : undefined;
  return { name, message: msg, stack };
}
export const dynamic = "force-dynamic"; // ensure fresh response on each request

export async function GET(request: Request) {
  
  try {
    // Infra route: decision optional; enforce only if provided.
    if (hasDecisionId(request)) {
      await runtimeGuard(request, { permission: "API_CALL" });
    }

    const version = process.env.NEXT_PUBLIC_APP_VERSION
      || process.env.VERCEL_GIT_COMMIT_SHA
      || "dev";
    const ts = new Date().toISOString();

  return NextResponse.json(
    { ok: true, version, ts },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    }
  );
  } catch (e: any) {
    const safe = toSafeError(e);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ ok: false, route: "//api/version", error: { name: safe.name, message: safe.message, ...(isDev ? { stack: safe.stack } : {}) } }, { status: 500 });
  }
}


