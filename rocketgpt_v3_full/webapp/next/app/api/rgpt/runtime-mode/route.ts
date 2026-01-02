import { NextResponse } from "next/server";
import { resolveRuntimeModeFromEnvAndHeaders } from "../../../../src/rgpt/runtime/runtime-mode.context";
import { assertRuntimePermission } from "../../../../src/rgpt/runtime/runtime-guard";

/**
 * Test endpoint to verify Runtime Mode resolution + enforcement.
 * Usage:
 *  - GET /api/rgpt/runtime-mode
 *  - Optional headers:
 *      x-rgpt-requested-mode: OFFLINE|SAFE|SUPERVISED|AUTONOMOUS
 *      x-rgpt-explicit-confirm: true|false
 *
 * Optional query:
 *   ?action=READ|WRITE|WORKFLOW_TRIGGER|CODE_MUTATION|POLICY_MUTATION|AUTO_HEAL
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "READ") as any;

  const runtime = resolveRuntimeModeFromEnvAndHeaders({
    headers: new Headers(req.headers),
  });

  const permission = assertRuntimePermission(runtime.mode, action);

  if (!permission.allowed) {
    return NextResponse.json(
      {
        ok: false,
        blocked: true,
        runtimeMode: runtime.mode,
        requestedAction: action,
        reason: permission.reason,
        runtime: {
          reason: runtime.reason,
          warnings: runtime.warnings,
          blockedTransitions: runtime.blockedTransitions,
        },
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    runtimeMode: runtime.mode,
    requestedAction: action,
    reason: runtime.reason,
    warnings: runtime.warnings,
    blockedTransitions: runtime.blockedTransitions,
    env: {
      RGPT_RUNTIME_MODE: process.env.RGPT_RUNTIME_MODE ?? null,
    },
  });
}

