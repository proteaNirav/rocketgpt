export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight health ping for monitoring systems.
 *
 * Intentionally minimal payload and logic, safe for high-frequency checks.
 */
export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      success: true,
      service: "RocketGPT Orchestrator",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
