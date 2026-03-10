import { NextRequest, NextResponse } from "next/server";

import { JOB_TYPES, enqueue } from "@/lib/jobs/queue.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};

  try {
    const queued = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, payload, { maxRetries: 1 });
    return NextResponse.json(
      {
        ok: true,
        runId: queued.runId,
        jobType: JOB_TYPES.RESEARCH_PACK_BUILD,
        planId: payload?.planId ?? null,
        status: queued.status,
        timelineUrl: `/api/jobs/${queued.runId}/timeline`,
        timelineStreamUrl: `/api/jobs/${queued.runId}/timeline/stream`,
        evidencePackByPlanUrl: payload?.planId ? `/api/jobs/research/plan/${encodeURIComponent(String(payload.planId))}` : null,
        telemetry: queued.telemetry,
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue research job.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
