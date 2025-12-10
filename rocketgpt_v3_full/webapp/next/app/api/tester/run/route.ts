export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { resolveTesterProfile } from "@/lib/tester/profiles";
import type {
  TesterRunRequest,
  TesterRunResolvedContext,
} from "@/lib/tester/types";
import {
  categorizeStatus,
  defaultExpectationForProfile,
} from "@/lib/tester/http_status";
import type { HttpStatusEvaluation } from "@/lib/tester/http_status";

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as Partial<TesterRunRequest> | null;

    const body: TesterRunRequest = {
      goal: json?.goal,
      run_id: json?.run_id,
      test_cases: json?.test_cases ?? [],
      profile: json?.profile,
      options: json?.options ?? {},
    };

    // Allow overriding profile via query string: ?profile=full
    const { searchParams } = new URL(req.url);
    const profileFromQuery = searchParams.get("profile");
    const effectiveProfileInput = profileFromQuery || body.profile || undefined;

    const resolvedProfile = resolveTesterProfile(effectiveProfileInput);

    const context: TesterRunResolvedContext = {
      request: body,
      profile: resolvedProfile,
    };

    // ============================================================
    // HTTP STATUS EVALUATION STUB
    // ------------------------------------------------------------
    // For now we are not actually calling any downstream HTTP API.
    // We simulate a "200 OK" response and evaluate it based on the
    // tester profile strictness. This will be replaced later by the
    // real tester engine's HTTP result.
    // ============================================================

    const assumedStatusCode = 200;
    const category = categorizeStatus(assumedStatusCode);
    const expectation = defaultExpectationForProfile(
      resolvedProfile.strictness
    );

    const httpStatusEvaluation: HttpStatusEvaluation = {
      status_code: assumedStatusCode,
      category,
      expected: expectation,
      result: "match",
      message: `Stub HTTP evaluation: got ${assumedStatusCode} (${category}) for profile '${resolvedProfile.id}'.`,
    };

    // TODO: Replace this stub with actual tester engine call, e.g.:
    // const engineResult = await runTesterEngine(context);
    // const httpStatusEvaluation = engineResult.http;

    const result = {
      success: true,
      profile: {
        id: resolvedProfile.id,
        label: resolvedProfile.label,
        strictness: resolvedProfile.strictness,
        depth: resolvedProfile.depth,
        maxTestCases: resolvedProfile.maxTestCases,
        maxDurationMs: resolvedProfile.maxDurationMs,
        parallelism: resolvedProfile.parallelism,
      },
      http: httpStatusEvaluation,
      summary: `Tester run scheduled with '${resolvedProfile.id}' profile.`,
      tests_executed: 0,
      evaluations: [],
      context,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[/api/tester/run] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "TesterRunError",
        message: error?.message ?? "Unexpected error while running tester.",
      },
      { status: 500 }
    );
  }
}
