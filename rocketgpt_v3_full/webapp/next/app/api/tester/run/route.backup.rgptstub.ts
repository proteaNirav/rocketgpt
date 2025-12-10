import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// --------------------------------------------------
// POST /api/tester/run
// Facade over /api/orchestrator/tester/execute
// --------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const runId = body?.runId;
    const buildId = body?.buildId;
    const testFiles = body?.testFiles;
    const mode = body?.mode ?? "single";
    const metadata = body?.metadata ?? {};

    if (!runId || typeof runId !== "number") {
      return NextResponse.json(
        { success: false, error: "InvalidPayload", message: "runId (number) is required." },
        { status: 400 }
      );
    }

    if (!buildId || typeof buildId !== "number") {
      return NextResponse.json(
        { success: false, error: "InvalidPayload", message: "buildId (number) is required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(testFiles) || testFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "InvalidPayload",
          message: "testFiles must be a non-empty string array.",
        },
        { status: 400 }
      );
    }

    const origin = req.nextUrl.origin;
    const targetUrl = new URL(
      "/api/orchestrator/tester/execute",
      origin
    ).toString();

    const forwardBody = JSON.stringify({
      runId,
      buildId,
      testFiles,
      mode,
      metadata,
    });

    const resp = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: forwardBody,
    });

    const json = await resp.json().catch(() => null);

    if (!resp.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "TesterExecuteForwardError",
          status: resp.status,
          response: json,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        ...json,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/tester/run] ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "TesterRunError",
        message: err?.message ?? "Unexpected error while starting tester run.",
      },
      { status: 500 }
    );
  }
}
