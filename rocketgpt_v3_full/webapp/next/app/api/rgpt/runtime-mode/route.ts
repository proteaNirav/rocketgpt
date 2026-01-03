import { NextRequest, NextResponse } from "next/server";
import { enforceRuntimeDecision } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


/**
 * GET /api/rgpt/runtime-mode
 * Minimal guard check endpoint.
 * Requires x-rgpt-decision-id header (fail-closed) and validates via enforceRuntimeDecision.
 */
export async function GET(req: NextRequest) {
  const decision_id = req.headers.get("x-rgpt-decision-id") ?? "";

  if (!decision_id) {
    return NextResponse.json(
      { ok: false, error: "MISSING_DECISION_ID" },
      { status: 400 }
    );
  }

  try {
    await enforceRuntimeDecision({ decision_id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "RUNTIME_GUARD_BLOCKED", reason: String(e?.message ?? e) },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, guarded: true, decision_id }, { status: 200 });
}
