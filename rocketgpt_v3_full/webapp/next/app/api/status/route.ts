import { NextResponse } from "next/server";
import { headers } from "next/headers";

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
    const status = res.status;
    if (!res.ok) return { ok: false, status };
    return { ok: true, status, data: await res.json() };
  } catch (e) {
    return { ok: false, error: (e as any)?.name || "fetch_error" };
  }
}

export async function GET() {
  const ts = new Date().toISOString();
  const build = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

  // Build exact origin from request headers to avoid alias/host mismatch
  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host  = h.get("x-forwarded-host") || h.get("host") || "";
  const base  = `${proto}://${host}`;

  const [health, version, limits] = await Promise.all([
    getJson(`${base}/api/health`),
    getJson(`${base}/api/version`),
    getJson(`${base}/api/limits`)
  ]);

  const status = {
    ok: !!(health?.ok && health.data?.ok === true),
    ts,
    build,
    version: version?.data?.version ?? build,
    health: {
      fetch_ok: health?.ok ?? false,
      http:    health?.status ?? null,
      ok:      health?.data?.ok ?? false,
      supabase_ok: health?.data?.supabase_ok ?? false,
      error:   health?.data?.error ?? null
    },
    plans: {
      fetch_ok: limits?.ok ?? false,
      http:     limits?.status ?? null,
      count: Array.isArray(limits?.data?.plans) ? limits.data.plans.length : 0
    },
    diag: {
      base_used: "headers-origin",
      host
    }
  };

  return NextResponse.json(status, { status: 200, headers: { "Cache-Control": "no-store" } });
}
