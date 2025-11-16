import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function controllerTimeout(ms: number) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, cancel: () => clearTimeout(id) };
}

async function getJson(url: string, timeoutMs = 6000) {
  try {
    const { signal, cancel } = controllerTimeout(timeoutMs);
    const res = await fetch(url, { method: "GET", cache: "no-store", signal });
    cancel();
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: (e as any)?.name || "fetch_error" };
  }
}

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  // Build a base URL for self-calls (works on Vercel; falls back to relative)
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const base = vercelUrl || "";

  // Best-effort fan-out (non-blocking style, all with timeouts)
  const [health, version, limits] = await Promise.all([
    getJson(`${base}/api/health`),
    getJson(`${base}/api/version`),
    getJson(`${base}/api/limits`) // optional; ignore failures
  ]);

  const status = {
    ok: !!(health?.ok && health.data?.ok === true),
    ts,
    build,
    version: version?.data?.version ?? build,
    health: {
      ok: health?.data?.ok ?? false,
      supabase_ok: health?.data?.supabase_ok ?? false,
      error: health?.data?.error ?? null
    },
    plans: {
      ok: limits?.ok ?? false,
      count: Array.isArray(limits?.data?.plans) ? limits.data.plans.length : 0
    }
  };

  return NextResponse.json(status, { status: 200, headers: { "Cache-Control": "no-store" } });
}
