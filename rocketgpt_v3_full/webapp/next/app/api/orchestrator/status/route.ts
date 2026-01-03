import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { getSafeModeEnabled } from "@/lib/orchestrator/safeModeState";

export const dynamic = "force-dynamic";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
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
