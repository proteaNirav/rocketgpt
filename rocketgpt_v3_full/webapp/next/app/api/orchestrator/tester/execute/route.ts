export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { safeModeGuard } from "../../_core/safeMode";

/**
 * RocketGPT Orchestrator â€“ Tester Execute Route (Stub)
 * PhaseB StepB7 â€“ Safe-Mode hardened.
 *
 * When Safe-Mode is active:
 *   - Request is blocked with structured SAFE_MODE_ACTIVE error.
 *
 * When Safe-Mode is disabled:
 *   - Returns a stubbed response confirming the endpoint is reachable.
 *   - No heavy tester execution is performed here yet.
 */

export async function POST(req: NextRequest): Promise<NextResponse> {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const url = new URL(req.url);

  const headerRunId = req.headers.get("x-rgpt-run-id") ?? undefined;
  const queryRunId = url.searchParams.get("run_id") ?? undefined;

  let body: any = {};
  try {
    body = (await req.json()) as any;
  } catch {
    body = {};
  }

  const bodyRunId: string | undefined = body.run_id ?? body.runId ?? undefined;
  const runId = headerRunId ?? queryRunId ?? bodyRunId ?? crypto.randomUUID();

  // Safe-Mode guard â€“ block high-risk capability when enabled
  try {
    safeModeGuard("tester-execute");
  } catch (err: any) {
    const statusCode = typeof err?.status === "number" ? err.status : 503;
    return NextResponse.json(err, { status: statusCode });
  }

  // Stubbed behaviour (no heavy side effects)
  return NextResponse.json(
    {
      success: true,
      message: "Orchestrator tester execute endpoint (stub).",
      route: "/api/orchestrator/tester/execute",
      runId,
      received_input: body ?? null,
      note:
        "PhaseB StepB7 placeholder. Wire to real tester engine in a future step.",
    },
    { status: 200 }
  );
}

