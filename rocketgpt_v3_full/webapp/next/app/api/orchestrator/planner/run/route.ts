// ============================================================================
//  RocketGPT Orchestrator â€“ Planner.Run API
//  PhaseB StepB7 â€“ Safe-Mode Hardened Implementation
// ============================================================================

import { NextResponse } from "next/server";
import { safeModeGuard } from "../../_core/safeMode";
import { runPlanner } from "../../_core/plannerEngine";

// ============================================================================
//  POST /api/orchestrator/planner/run
//  Description:
//    Executes the Planner agent to generate a plan from goal input.
//    Fully blocked when Safe-Mode is active.
// ============================================================================

export async function POST(req: Request) {
  try {
    // Enforce Safe-Mode protection
    safeModeGuard("planner");

    const body = await req.json();
    const plannerResult = await runPlanner(body);

    return NextResponse.json({
      success: true,
      route: "/api/orchestrator/planner/run",
      planner: plannerResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    // Safe-Mode or planner failure
    return NextResponse.json(err, { status: 503 });
  }
}
