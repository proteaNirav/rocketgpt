import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const startedAt = new Date().toISOString();
  // Best-effort service pings can be added here later
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_SHA || "unknown";
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "v0";

  return NextResponse.json({
    ok: true,
    startedAt,
    commit,
    version,
    services: {
      vercel: "assumed-ok",
      railway: "assumed-ok",
      supabase: "assumed-ok"
    }
  });
}
