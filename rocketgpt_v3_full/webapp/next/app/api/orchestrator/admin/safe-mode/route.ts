export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { getSafeMode } from "../../_core/safeMode";

const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY;

/**
 * GET /api/orchestrator/admin/safe-mode
 * Returns the current Safe-Mode state.
 * Secured via x-rgpt-internal header.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  // Internal key enforcement
  if (INTERNAL_KEY) {
    const hdr = req.headers.get("x-rgpt-internal") ?? "";
    if (hdr !== INTERNAL_KEY) {
      return NextResponse.json(
        {
          success: false,
          error_code: "UNAUTHORIZED",
          message: "Invalid or missing x-rgpt-internal header.",
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.json(
    {
      success: true,
      safe_mode: getSafeMode(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

