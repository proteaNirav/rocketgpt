import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
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
