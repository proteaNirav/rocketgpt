export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


/**
 * Deep health diagnostics.
 *
 * TODO: Implement detailed checks:
 *  - Internal orchestrator sub-systems
 *  - Downstream services (DB, queues, external APIs, etc.)
 *  - Configuration and environment sanity
 *
 * NOTE: This endpoint may be relatively "heavier" and is expected
 * to be called less frequently (e.g., manual checks, scheduled probes).
 */
export async function GET(_req: NextRequest) {
  await runtimeGuard(_req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const diagnostics = {
    success: true,
    service: "RocketGPT Orchestrator",
    mode: "deep",
    checks: {
      orchestrator_core: {
        ok: true,
        details: "Stubbed deep health check - replace with real diagnostics.",
      },
      planner: {
        ok: true,
        details: "Planner deep check not yet implemented.",
      },
      builder: {
        ok: true,
        details: "Builder deep check not yet implemented.",
      },
      tester: {
        ok: true,
        details: "Tester deep check not yet implemented.",
      },
      approvals: {
        ok: true,
        details: "Approvals deep check not yet implemented.",
      },
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(diagnostics, { status: 200 });
}
