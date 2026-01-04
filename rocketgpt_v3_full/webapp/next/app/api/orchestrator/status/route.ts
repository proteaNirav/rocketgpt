import { NextResponse } from "next/server";
// Safe-Mode detection (CI forces this ON; must short-circuit safely)
function isSafeMode(): boolean {
  const v = (process.env.RGPT_SAFE_MODE ?? process.env.SAFE_MODE ?? process.env.RGPT_RUNTIME_MODE ?? "").toString().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "safe" || v === "safemode";
}

export const runtime = "nodejs";


export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      safeMode: isSafeMode(),
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    // Never throw from status; CI expects a stable endpoint
    return NextResponse.json({
      ok: false,
      safeMode: isSafeMode(),
      error: "STATUS_ROUTE_ERROR",
      message: e?.message ?? String(e),
      ts: new Date().toISOString(),
    }, { status: 200 });
  }
}


