import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  let supabase_ok = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      // Supabase Auth settings endpoint tends to be a stable 200 when reachable
      const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
        method: "GET",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        cache: "no-store",
      });
      supabase_ok = res.ok;
    }
  } catch {
    supabase_ok = false;
  }

  return NextResponse.json(
    { ok: true, ts, build, supabase_ok },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
