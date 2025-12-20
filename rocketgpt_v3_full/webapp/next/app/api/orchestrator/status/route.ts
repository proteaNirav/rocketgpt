import { NextResponse } from "next/server";
import { getSafeModeEnabled } from "@/lib/orchestrator/safeModeState";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    orchestrator: {
      service: "RocketGPT Orchestrator",
      version: "v3",
      safe_mode: {
        enabled: getSafeModeEnabled(),
      },
      capabilities: {
        planner: true,
        builder: true,
        tester: true,
        approvals: true,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
