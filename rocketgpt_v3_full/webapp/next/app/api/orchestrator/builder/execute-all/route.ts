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

interface OrchestratorBuilderExecuteAllResponse {
  success: boolean;
  message: string;
  builder: {
    success: boolean;
    message: string;
    tester: TesterRunResponse | null;
  };
}

/**
 * POST /api/orchestrator/builder/execute-all
 *
 * Orchestrator → Builder execute-all (RealTester-wired):
 * - Generates a runId.
 * - Calls /api/orchestrator/tester/execute (which calls /api/tester/run).
 * - Wraps the response in a { success, message, builder: { ... } } shape.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    const incomingRunId: string | undefined = body?.runId;
    const runId = incomingRunId ?? randomUUID();

    const testerRequest: Partial<TesterRunRequest> = {
      runId,
      planId: body?.planId,
      goalTitle: body?.goalTitle ?? "Execute-all smoke test",
      goalSummary:
        body?.goalSummary ??
        "End-to-end Orchestrator → Builder → Tester pipeline (RealTester runner, pnpm lint).",
      buildArtifacts: body?.buildArtifacts ?? [],
      // 🔽 Default now uses 'pnpm lint' instead of 'pnpm test'
      testCommand: body?.testCommand ?? "pnpm lint",
    };

    // Build absolute URL for /api/orchestrator/tester/execute
    const testerExecuteUrl = new URL(
      "/api/orchestrator/tester/execute",
      request.url
    );

    const testerExecuteResponse = await fetch(testerExecuteUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify(testerRequest),
    });

    const testerExecuteJson =
      (await testerExecuteResponse.json()) as OrchestratorTesterExecuteResponse;

    const testerSuccess =
      testerExecuteResponse.ok && testerExecuteJson && testerExecuteJson.success;

    const payload: OrchestratorBuilderExecuteAllResponse = {
      success: testerSuccess,
      message: testerSuccess
        ? "Orchestrator → Builder execute-all completed successfully."
        : `Orchestrator → Builder execute-all encountered issues (HTTP ${testerExecuteResponse.status}).`,
      builder: {
        success: testerSuccess,
        message: testerSuccess
          ? "Orchestrator → Tester integration OK."
          : "Orchestrator → Tester integration failed.",
        tester: testerExecuteJson?.tester ?? null,
      },
    };

    return NextResponse.json(payload, {
      status: testerSuccess ? 200 : 500,
    });
  } catch (error: any) {
    console.error("[orchestrator/builder/execute-all] Error:", error);

    const payload: OrchestratorBuilderExecuteAllResponse = {
      success: false,
      message:
        "Orchestrator → Builder execute-all failed due to an internal error in /api/orchestrator/builder/execute-all.",
      builder: {
        success: false,
        message: "Orchestrator → Tester integration failed.",
        tester: null,
      },
    };

    return NextResponse.json(payload, { status: 500 });
  }
}
