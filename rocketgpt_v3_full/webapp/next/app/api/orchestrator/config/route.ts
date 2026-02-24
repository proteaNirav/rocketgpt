import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


export const dynamic = "force-dynamic";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: await headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  return NextResponse.json({
    success: true,
    safe_config: {
      environment: process.env.NODE_ENV,
      region: process.env.RGPT_REGION || "local",
      planner_model: process.env.RGPT_PLANNER_MODEL,
      builder_model: process.env.RGPT_BUILDER_MODEL,
    }
  });
}

