import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // force Node runtime (avoid Edge quirks)

// Helper: normalize env values – trims whitespace and surrounding single/double quotes
function normalizeEnv(v?: string | null): string {
  if (!v) return "";
  return v.trim().replace(/^["']|["']$/g, "");
}

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  const rawUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const url  = normalizeEnv(rawUrl).replace(/\/$/, "");
  const anon = normalizeEnv(rawAnon);

  let supabase_ok = false;
  let error: string | null = null;
  let url_host = "";
  let has_key = !!anon;

  try {
    if (url) {
      try { url_host = new URL(url).host; } catch {}
    }

    if (url && anon) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${url}/auth/v1/settings`, {
        method: "GET",
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
        signal: controller.signal,
        // next: { revalidate: 0 } // optional, cache-buster
      });
      clearTimeout(t);
      supabase_ok = res.ok;
      if (!res.ok) {
        error = `status_${res.status}`;
      }
    } else {
      error = !url ? "missing_url" : "missing_key";
    }
  } catch (e: any) {
    error = e?.name ? `${e.name}` : "fetch_error";
  }

  return NextResponse.json(
    { ok: true, ts, build, supabase_ok, url_host, has_key, error },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
