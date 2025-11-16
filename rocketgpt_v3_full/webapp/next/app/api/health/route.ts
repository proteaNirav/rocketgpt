import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Helper: normalize env values – trims whitespace and surrounding single/double quotes
function normalizeEnv(v?: string | null): string {
  if (!v) return "";
  return v.trim().replace(/^["']|["']$/g, "");
}

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const url = normalizeEnv(rawUrl).replace(/\/$/, "");
  const anon = normalizeEnv(rawAnon);

  let supabase_ok = false;
  if (url && anon) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        method: "GET",
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        // avoid caching
        cache: "no-store",
        // in case the edge runtime defaults, enforce a short timeout using AbortController
        signal: (() => {
          const c = new AbortController();
          setTimeout(() => c.abort(), 5000);
          return c.signal;
        })(),
      });
      supabase_ok = res.ok;
    } catch {
      supabase_ok = false;
    }
  }

  return NextResponse.json(
    { ok: true, ts, build, supabase_ok },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
