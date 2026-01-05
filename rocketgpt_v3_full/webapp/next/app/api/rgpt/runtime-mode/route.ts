import { NextRequest, NextResponse } from "next/server";
import { ledgerUpsertExecution } from "@/rgpt/ledger/runtime-ledger";
import { enforceRuntimeDecision } from "@/rgpt/runtime/runtime-guard";

async function rgptTryLedger(op: string) {
  // RGPT_LEDGER_HOOK
  try {
    const reqId =
      (globalThis.crypto && "randomUUID" in globalThis.crypto)
        ? (globalThis.crypto as any).randomUUID()
        : ("req_" + Date.now());

    const rootId =
      (globalThis.crypto && "randomUUID" in globalThis.crypto)
        ? (globalThis.crypto as any).randomUUID()
        : ("root_" + Date.now());

    await ledgerUpsertExecution({
      idempotency_key: "runtime-mode:" + op + ":" + reqId,
      request_id: reqId,
      root_execution_id: rootId,

      actor_type: "system",
      actor_id: "api:rgpt/runtime-mode",
      runtime_mode: "normal",

      component: "api_route",
      operation: op,
      target_ref: "/api/rgpt/runtime-mode",
      status: "succeeded",
    });
  } catch (e) {
    // Non-breaking: do not fail the route if ledger is unavailable
    console.warn("[rgpt][ledger] runtime-mode ledger write skipped:", e);
  }
}
export const runtime = "nodejs";

/**
 * GET /api/rgpt/runtime-mode
 * Minimal guard check endpoint.
 * Requires x-rgpt-decision-id header (fail-closed) and validates via enforceRuntimeDecision.
 */
export async function GET(req: NextRequest) {
  void rgptTryLedger("GET");
  
  void rgptTryLedger('GET');
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






