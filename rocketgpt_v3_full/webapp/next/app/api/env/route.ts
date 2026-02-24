import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// NEVER leak secrets. Only report existence + length.
function info(name: string, v: string | undefined | null) {
  const s = (v ?? "").toString();
  return {
    name,
    present: !!s,
    length: s.length,
    // show tiny fingerprint for debugging, not reversible
    head4: s ? s.slice(0, 4) : "",
    tail4: s && s.length >= 4 ? s.slice(-4) : "",
  };
}

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: await headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const vars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_GIT_COMMIT_SHA",
    "NODE_ENV"
  ];

  const items = vars.map((k) => info(k, process.env[k]));
  return NextResponse.json({ ok: true, items }, { status: 200, headers: { "Cache-Control": "no-store" } });
}

