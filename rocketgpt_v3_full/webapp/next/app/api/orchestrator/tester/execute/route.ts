export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type TesterStatus = "success" | "failed" | "error" | "partial";

interface TesterRunRequest {
  runId: string;
  planId?: string | number;
  goalTitle?: string;
  goalSummary?: string;
  buildArtifacts?: any[];
  testCommand?: string;
}

interface TesterResultEntry {
  test_case: string;
  status: "passed" | "failed" | "skipped" | "error";
  error: string | null;
  duration_ms: number | null;
}

interface TesterRunResponse {
  test_run_id: string;
  status: TesterStatus;
  summary: string;
  results: TesterResultEntry[];
  logs: string[];
  artifacts: string[];
}

interface OrchestratorTesterExecuteResponse {
  success: boolean;
  message: string;
  tester: TesterRunResponse | null;
}

/**
 * POST /api/orchestrator/tester/execute
 *
 * Orchestrator → Tester adapter:
 * - Accepts a tester execution request (runId, planId, etc.).
 * - Calls /api/tester/run internally.
 * - Returns { success, message, tester } for the Orchestrator/Builder.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = (rawBody ? JSON.parse(rawBody) : {}) as Partial<TesterRunRequest>;

    const runId = body.runId ?? randomUUID();

    const testerRequest: TesterRunRequest = {
      runId,
      planId: body.planId,
      goalTitle: body.goalTitle,
      goalSummary: body.goalSummary,
      buildArtifacts: body.buildArtifacts ?? [],
      testCommand: body.testCommand,
    };

    // Build absolute URL for /api/tester/run based on incoming request
    const testerUrl = new URL("/api/tester/run", request.url);

    const testerResponse = await fetch(testerUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(testerRequest),
    });

    const testerJson = (await testerResponse.json()) as TesterRunResponse;

    const ok =
      testerResponse.ok &&
      testerJson &&
      (testerJson.status === "success" || testerJson.status === "partial");

    const payload: OrchestratorTesterExecuteResponse = {
      success: ok,
      message: ok
        ? "Orchestrator → Tester execute completed."
        : `Orchestrator → Tester execute encountered issues (HTTP ${testerResponse.status}).`,
      tester: testerJson ?? null,
    };

    return NextResponse.json(payload, {
      status: ok ? 200 : 500,
    });
  } catch (error: any) {
    console.error("[orchestrator/tester/execute] Error:", error);

    const payload: OrchestratorTesterExecuteResponse = {
      success: false,
      message:
        "Orchestrator → Tester execute failed due to an internal error in /api/orchestrator/tester/execute.",
      tester: null,
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
