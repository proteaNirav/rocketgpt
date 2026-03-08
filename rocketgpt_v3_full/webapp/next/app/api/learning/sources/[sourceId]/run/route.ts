import { NextRequest, NextResponse } from "next/server";

import { ingestRssSource } from "@/lib/learning/service";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readLearningActor(req);
    if (!actor.canReview) {
      return NextResponse.json({ error: "Reviewer/admin role required." }, { status: 403 });
    }
    const { sourceId } = await ctx.params;
    const result = await ingestRssSource({
      tenantId: actor.tenantId,
      sourceId,
      actorUserId: actor.userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RSS ingestion failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
