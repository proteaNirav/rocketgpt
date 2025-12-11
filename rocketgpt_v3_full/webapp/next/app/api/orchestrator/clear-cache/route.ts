import { NextResponse } from "next/server";
import { clearOrchestratorCache } from "@/lib/orchestrator/cache";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearOrchestratorCache();

  return NextResponse.json({
    success: true,
    message: "Orchestrator cache cleared."
  });
}
