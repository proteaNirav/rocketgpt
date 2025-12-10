export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import {
  logOrchTesterInfo,
  logOrchTesterError,
} from "@/lib/logging/orchestratorTester";

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
  let parsedBody: OrchestratorTesterExecuteRequest | null = null;

  try {
    parsedBody = (await req.json().catch(() => null)) as
      | OrchestratorTesterExecuteRequest
      | null;

    const body: OrchestratorTesterExecuteRequest = {
      goal: parsedBody?.goal,
      run_id: parsedBody?.run_id,
      profile: parsedBody?.profile,
      test_cases: parsedBody?.test_cases ?? [],
      options: parsedBody?.options ?? {},
    };

    logOrchTesterInfo("Orchestrator tester execute: request received", {
      run_id: body.run_id,
      profile: body.profile,
      goal: body.goal,
      context: {
        test_cases_count: body.test_cases?.length ?? 0,
      },
    });

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

    logOrchTesterInfo("Orchestrator tester execute: tester response received", {
      run_id: body.run_id,
      profile: body.profile,
      goal: body.goal,
      orchestrator_status_code: testerRes.status,
      tester_status_code: testerPayload?.http?.status_code ?? null,
      tester_success: testerPayload?.success ?? null,
      context: {
        tester_http_category: testerPayload?.http?.category ?? null,
        tests_executed: testerPayload?.tests_executed ?? null,
      },
    });

    return NextResponse.json(response, { status: testerRes.status });
  } catch (error: any) {
    logOrchTesterError("Orchestrator tester execute: error", {
      run_id: parsedBody?.run_id,
      profile: parsedBody?.profile,
      goal: parsedBody?.goal,
      context: {
        error_message: error?.message ?? "Unknown error",
        error_stack: error?.stack ?? null,
      },
    });

    // eslint-disable-next-line no-console
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
