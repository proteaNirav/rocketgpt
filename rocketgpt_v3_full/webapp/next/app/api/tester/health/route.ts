import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Lightweight Tester health endpoint for Playwright + external probes.
 * Does NOT run full test suites or call heavy flows.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    service: "tester",
    message: "Tester health OK",
    timestamp: new Date().toISOString(),
  });
}
