import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Tester model service
// Assumes you already have: /lib/llm/testerModel.ts
// Modify the import if your path differs.
import { callTesterModel } from "@/lib/llm/testerModel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      run_id,
      files_changed,
      plan,
      steps,
      test_config,
      environment,
    } = body;

    if (!files_changed || !Array.isArray(files_changed) || files_changed.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or empty 'files_changed' array in request body.",
        },
        { status: 400 }
      );
    }

    const effectiveRunId = run_id || uuidv4();

    // Prepare payload for Tester model
    const testerInput = {
      run_id: effectiveRunId,
      files_changed,
      plan: plan ?? null,
      steps: steps ?? null,
      test_config: test_config ?? {},
      environment: environment ?? "local",
    };

    // Call Tester model / service
    const testerOutput = await callTesterModel(testerInput);

    if (!testerOutput) {
      return NextResponse.json(
        {
          success: false,
          run_id: effectiveRunId,
          message: "Tester returned no output.",
        },
        { status: 500 }
      );
    }

    // Expected testerOutput shape (flexible, pass-through friendly)
    // {
    //   test_run_id: string;
    //   status: "success" | "failed" | "partial";
    //   summary: string;
    //   results: [
    //     { test_case: string; status: string; error?: string | null; duration_ms?: number }
    //   ];
    //   logs: string[];
    //   artifacts: string[];
    // }

    const payload = {
      success: true,
      run_id: effectiveRunId,
      test_run_id: testerOutput.test_run_id ?? uuidv4(),
      status: testerOutput.status ?? "unknown",
      summary: testerOutput.summary ?? "Test execution completed.",
      test_results: testerOutput.results ?? [],
      logs: testerOutput.logs ?? [],
      artifacts: testerOutput.artifacts ?? [],
      raw: testerOutput, // full raw output for debugging if needed
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("[TEST API] Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Unhandled server error in Tester API.",
        error: err?.message,
      },
      { status: 500 }
    );
  }
}
