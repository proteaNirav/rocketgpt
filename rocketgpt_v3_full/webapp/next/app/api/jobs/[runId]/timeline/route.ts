import { NextRequest, NextResponse } from "next/server";

import { getTimelineEtag, getTimelineSnapshot } from "@/lib/jobs/timeline.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { runId } = await ctx.params;
  const planId = req.nextUrl.searchParams.get("planId");
  const afterSeqParam = req.nextUrl.searchParams.get("afterSeq");
  const afterSeq = Number(afterSeqParam || "0");
  const limit = Number(req.nextUrl.searchParams.get("limit") || "200");

  const etag = getTimelineEtag(runId);
  const incoming = req.headers.get("if-none-match");
  if (incoming && incoming === etag && !afterSeqParam) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const snapshot = getTimelineSnapshot(runId, {
    afterSeq: Number.isFinite(afterSeq) ? afterSeq : 0,
    limit: Number.isFinite(limit) ? limit : 200,
    planId: planId || undefined,
  });
  return NextResponse.json(
    {
      ok: true,
      runId,
      lastSeq: snapshot.lastSeq,
      events: snapshot.events,
    },
    {
      status: 200,
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
      },
    }
  );
}
