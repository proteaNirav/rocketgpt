import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Builder model service
// Assumes you already have: /lib/llm/builderModel.ts
// Modify the import if your path differs.
import { callBuilderModel } from "@/lib/llm/builderModel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let { run_id, step, steps, plan, context_files } = body;

    // Validate minimal input
    if (!step && !steps) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing 'step' or 'steps' in request body.",
        },
        { status: 400 }
      );
    }

    // Normalize steps to an array
    const normalizedSteps = steps ?? (step ? [step] : []);

    if (!run_id) {
      run_id = uuidv4();
    }

    // Prepare payload for the Builder LLM
    const builderInput = {
      run_id,
      plan: plan ?? null,
      steps: normalizedSteps,
      context_files: context_files ?? [],
    };

    // Call Builder model
    const builderOutput = await callBuilderModel(builderInput);

    if (!builderOutput) {
      return NextResponse.json(
        {
          success: false,
          run_id,
          message: "Builder returned no output.",
        },
        { status: 500 }
      );
    }

    // Expected shape (flexible, pass-through friendly)
    // {
    //   files_changed: [{ file_path, diff, description? }],
    //   summary: string,
    //   logs: string[]
    // }

    const payload = {
      success: true,
      run_id,
      steps: normalizedSteps,
      files_changed: builderOutput.files_changed ?? [],
      summary: builderOutput.summary ?? "Build completed.",
      logs: builderOutput.logs ?? [],
      raw: builderOutput, // optional full payload for debugging
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("[BUILD API] Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Unhandled server error in Builder API.",
        error: err?.message,
      },
      { status: 500 }
    );
  }
}
