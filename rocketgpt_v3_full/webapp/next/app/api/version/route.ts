import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export const dynamic = "force-dynamic"; // ensure fresh response on each request

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
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
}
