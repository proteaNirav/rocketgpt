import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export const dynamic = "force-dynamic";

/**
 * Lightweight Tester health endpoint for Playwright + external probes.
 * Does NOT run full test suites or call heavy flows.
 */
export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  return NextResponse.json({
    success: true,
    service: "tester",
    message: "Tester health OK",
    timestamp: new Date().toISOString(),
  });
}
