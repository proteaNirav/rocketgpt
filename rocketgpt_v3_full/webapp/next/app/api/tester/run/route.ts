export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import {
  TesterRunRequest,
  TesterRunResponse,
  runTests,
} from "@/utils/testerRunner";

/**
 * POST /api/tester/run
 *
 * RealTester runner:
 * - Accepts a TesterRunRequest-like payload.
 * - Invokes the core testerRunner (runTests).
 * - Returns a TesterRunResponse.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = (rawBody ? JSON.parse(rawBody) : {}) as Partial<TesterRunRequest>;

    const response = await runTests(body);

    const ok =
      response.status === "success" || response.status === "partial";

    return NextResponse.json(response, {
      status: ok ? 200 : 500,
    });
  } catch (error: any) {
    console.error("[tester/run] Error while executing tests:", error);

    const errorResponse: TesterRunResponse = {
      test_run_id: "",
      status: "error",
      summary:
        "Test execution failed due to an internal error in /api/tester/run.",
      results: [],
      logs: [
        "Tester route threw an exception before invoking testerRunner.",
        String(error?.message ?? error),
        String(error?.stack ?? ""),
      ],
      artifacts: [],
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
