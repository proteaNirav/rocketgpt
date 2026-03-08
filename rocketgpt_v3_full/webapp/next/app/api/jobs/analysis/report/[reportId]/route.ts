import { NextRequest, NextResponse } from "next/server";

import { getAnalysisReportById } from "@/lib/jobs/analyst-layer.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reportId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { reportId } = await ctx.params;
  const report = getAnalysisReportById(reportId);
  if (!report) {
    return NextResponse.json({ ok: false, error: "AnalysisReport not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, analysisReport: report }, { status: 200 });
}

