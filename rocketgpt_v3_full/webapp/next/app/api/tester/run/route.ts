export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { getTesterProfile } from "@/lib/tester/profiles";
import { defaultExpectationForProfile,evaluateHttpStatus,
} from "@/lib/tester/http_status";
import { getTesterEngine, TesterExecutionResult } from "@/lib/tester/engine";

type TesterRunRequest = {
  goal?: string;
  run_id?: string;
  profile?: string;
  test_cases?: string[];
  options?: Record<string, unknown>;
};

type TesterRunResponse = {
  success: boolean;
  profile: ReturnType<typeof getTesterProfile>;
  http: ReturnType<typeof evaluateHttpStatus>;
  summary: string;
  tests_executed: number;
  engine: TesterExecutionResult;
  run_id: string | null;
};

export async function POST(req: NextRequest) {
  let parsedBody: TesterRunRequest | null = null;

  try {
    parsedBody = (await req.json().catch(() => null)) as TesterRunRequest | null;

    const body: TesterRunRequest = {
      goal: parsedBody?.goal,
      run_id: parsedBody?.run_id,
      profile: parsedBody?.profile,
      test_cases: parsedBody?.test_cases ?? ["sample-orchestrator-test.js"],
      options: parsedBody?.options ?? {},
    };

    const profile = getTesterProfile(body.profile);
    const engine = getTesterEngine("stub");

    const engineResult = await engine.runTests(
      body.test_cases ?? [],
      body.options ?? {}
    );

    // For now, this route itself returns 200 on success, so we evaluate HTTP
    // using the expectation model and a fixed 200 code.
    const expectation = defaultExpectationForProfile(profile.id);
    const httpEval = evaluateHttpStatus(200, expectation);

    const summary =
      body.goal && body.goal.trim().length > 0
        ? `Tester run scheduled with '${profile.id}' profile for goal: ${body.goal}`
        : `Tester run scheduled with '${profile.id}' profile.`;

    const response: TesterRunResponse = {
      success: engineResult.success,
      profile,
      http: httpEval,
      summary,
      tests_executed: engineResult.tests_executed,
      engine: engineResult,
      run_id: body.run_id ?? null,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/tester/run] Error:", error);

    const fallbackProfile = getTesterProfile(null);
    const fallbackExpectation = defaultExpectationForProfile(fallbackProfile.id);
    const httpEval = evaluateHttpStatus(500, fallbackExpectation);

    return NextResponse.json(
      {
        success: false,
        profile: fallbackProfile,
        http: httpEval,
        summary:
          "Tester run failed due to an unexpected error in /api/tester/run.",
        tests_executed: 0,
        engine: {
          success: false,
          tests_executed: 0,
          tests_passed: 0,
          tests_failed: 0,
          duration_ms: 0,
          logs: [
            "Tester engine not executed due to route-level error.",
            error?.message ?? "Unknown error.",
          ],
        } as TesterExecutionResult,
        run_id: parsedBody?.run_id ?? null,
        error: {
          message:
            error?.message ??
            "Unexpected error while running tester engine in /api/tester/run.",
        },
      },
      { status: 500 }
    );
  }
}

