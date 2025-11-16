import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // ensure fresh response on each request

export async function GET() {
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
