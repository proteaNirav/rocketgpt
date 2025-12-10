import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Planner model service
// Assumes you already have: /lib/llm/plannerModel.ts
// Modify import if your path differs.
import { callPlannerModel } from "@/lib/llm/plannerModel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { goal_title, goal_description } = body;

    if (!goal_title || !goal_description) {
      return NextResponse.json(
        { success: false, message: "Missing goal_title or goal_description." },
        { status: 400 }
      );
    }

    // Generate new run ID for orchestration
    const runId = uuidv4();

    // Call the Planner LLM
    const plannerOutput = await callPlannerModel({
      goal_title,
      goal_description,
    });

    if (!plannerOutput || !plannerOutput.steps) {
      return NextResponse.json(
        {
          success: false,
          run_id: runId,
          message: "Planner failed or returned invalid output.",
        },
        { status: 500 }
      );
    }

    // Standardized output format for Builder
    const payload = {
      success: true,
      run_id: runId,
      plan_title: plannerOutput.plan_title ?? goal_title,
      goal_summary: plannerOutput.goal_summary ?? goal_description,
      steps: plannerOutput.steps,
      raw: plannerOutput, // optional debugging block
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (err: any) {
    console.error("[PLAN API] Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Unhandled server error in Planner API.",
        error: err?.message,
      },
      { status: 500 }
    );
  }
}
