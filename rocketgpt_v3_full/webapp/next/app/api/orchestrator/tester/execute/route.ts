export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";

type OrchestratorTesterExecuteRequest = {
  /**
   * High-level goal or description of what we are testing.
   * This is passed through to the Tester API.
   */
  goal?: string;

  /**
   * Optional run identifier for correlation / logging.
   */
  run_id?: string;

  /**
   * Desired Tester profile, e.g. "base", "light", "full", "stress", "regression".
   * This is passed straight through to /api/tester/run.
   */
  profile?: string;

  /**
   * Optional explicit list of test cases.
   */
  test_cases?: string[];

  /**
   * Arbitrary options forwarded to the Tester engine.
   */
  options?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => null)) as
      | OrchestratorTesterExecuteRequest
      | null;

    const body: OrchestratorTesterExecuteRequest = {
      goal: json?.goal,
      run_id: json?.run_id,
      profile: json?.profile,
      test_cases: json?.test_cases ?? [],
      options: json?.options ?? {},
    };

    // Construct internal URL for Tester API
    const testerUrl = new URL("/api/tester/run", req.url);

    const testerRes = await fetch(testerUrl.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const testerPayload: any = await testerRes.json().catch(() => null);

    const response = {
      success: testerRes.ok && testerPayload?.success !== false,
      orchestrator: {
        status_code: testerRes.status,
        status_text: testerRes.statusText,
      },
      tester: {
        success: testerPayload?.success ?? null,
        profile: testerPayload?.profile ?? null,
        http: testerPayload?.http ?? null,
        summary: testerPayload?.summary ?? null,
        tests_executed: testerPayload?.tests_executed ?? null,
      },
      // Full raw payload for debugging / future evolution
      tester_raw: testerPayload,
      // Echo back the request we sent to tester for traceability
      forwarded_request: body,
    };

    return NextResponse.json(response, { status: testerRes.status });
  } catch (error: any) {
    console.error("[/api/orchestrator/tester/execute] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "OrchestratorTesterExecuteError",
        message:
          error?.message ??
          "Unexpected error while running orchestrator tester execute.",
      },
      { status: 500 }
    );
  }
}
