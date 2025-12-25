import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "RocketGPT Orchestrator",
    version: "v3",
    capabilities: {
      planner: true,
      builder: true,
      tester: true,
      approvals: true
    },
    timestamp: new Date().toISOString()
  });
}
