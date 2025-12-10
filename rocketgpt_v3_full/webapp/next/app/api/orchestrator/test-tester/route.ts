import { NextRequest, NextResponse } from "next/server";
import { callTesterFromOrchestrator } from "../_lib/testerClient";

export const runtime = "nodejs";

// ---------------------------------------------------------
// POST /api/orchestrator/test-tester
// Simple smoke test for Orchestrator → Tester integration.
// ---------------------------------------------------------
export async function POST(_req: NextRequest) {
  try {
    const testerResponse = await callTesterFromOrchestrator({
      plan_id: "demo-plan",
      step_id: "orchestrator-test-tester-step",
      builder_output: {
        files: [
          {
            filename: "sample-orchestrator-test.js",
            content: `module.exports = async function () {
  console.log("Running sample test from Orchestrator → Tester test-tester route...");
  if (3 * 3 !== 9) {
    throw new Error("Math logic failed in orchestrator test route");
  }
};`,
          },
        ],
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Orchestrator → Tester integration OK.",
        tester: testerResponse,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Orchestrator → Tester integration FAILED.",
        error: error?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}
