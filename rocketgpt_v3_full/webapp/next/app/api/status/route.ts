import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, name: "rocketgpt-ui", ts: new Date().toISOString() },
    { status: 200 }
  );
}
