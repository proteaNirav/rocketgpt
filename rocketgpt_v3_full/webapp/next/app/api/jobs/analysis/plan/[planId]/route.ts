import { NextRequest, NextResponse } from "next/server";

import { getAnalysisReportByPlanId } from "@/lib/jobs/analyst-layer.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { planId } = await ctx.params;
  const report = getAnalysisReportByPlanId(planId);
  if (!report) {
    return NextResponse.json({ ok: false, error: "AnalysisReport not found for planId." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, analysisReport: report }, { status: 200 });
}

