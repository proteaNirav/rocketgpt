import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Placeholder for actual release logic
// Later you may integrate: GitHub PR creation, commit, Vercel preview, etc.
async function performReleaseAction(_input: any) {
  // Simulate processing delay and response
  return {
    release_id: uuidv4(),
    status: "success",
    message: "Release simulation executed successfully.",
    actions_taken: [
      "Validated test results",
      "Prepared release payload",
      "Simulated commit / PR action"
    ],
  };
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      run_id,
      test_run_id,
      test_results,
      artifacts,
      environment,
      release_notes,
      auto_merge
    } = body;

    const effectiveRunId = run_id || uuidv4();

    // Basic _input validation
    if (!test_results || !Array.isArray(test_results)) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing or invalid 'test_results' array.",
        },
        { status: 400 }
      );
    }

    // Build Release _input
    const releaseInput = {
      run_id: effectiveRunId,
      test_run_id: test_run_id ?? uuidv4(),
      environment: environment ?? "local",
      release_notes: release_notes ?? "",
      test_results,
      artifacts: artifacts ?? [],
      auto_merge: auto_merge ?? false,
    };

    // Perform release action (placeholder until GitHub integration)
    const releaseOutput = await performReleaseAction(releaseInput);

    const payload = {
      success: true,
      run_id: effectiveRunId,
      release_id: releaseOutput.release_id,
      status: releaseOutput.status,
      message: releaseOutput.message,
      actions_taken: releaseOutput.actions_taken ?? [],
      _input: releaseInput,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("[RELEASE API] Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Unhandled server error in Release API.",
        error: err?.message,
      },
      { status: 500 }
    );
  }
}
