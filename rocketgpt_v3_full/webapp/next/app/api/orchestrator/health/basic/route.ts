export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

/**
 * Lightweight health ping for monitoring systems.
 *
 * Intentionally minimal payload and logic, safe for high-frequency checks.
 */
export async function GET(_req: NextRequest) {
  await runtimeGuard(_req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
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
