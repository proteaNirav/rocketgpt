import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { clearOrchestratorCache } from "@/lib/orchestrator/cache";
export const runtime = "nodejs";


export const dynamic = "force-dynamic";

export async function POST() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  await clearOrchestratorCache();

  return NextResponse.json({
    success: true,
    message: "Orchestrator cache cleared."
  });
}
