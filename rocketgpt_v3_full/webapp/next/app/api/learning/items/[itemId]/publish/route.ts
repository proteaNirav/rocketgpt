import { NextRequest, NextResponse } from "next/server";

import { publishApprovedLearningItem } from "@/lib/learning/service";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ itemId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readLearningActor(req);
    if (!actor.canReview) {
      return NextResponse.json({ error: "Reviewer/admin role required." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const libraryId = String(body?.libraryId || "").trim() || "global";
    const { itemId } = await ctx.params;
    const result = await publishApprovedLearningItem({
      tenantId: actor.tenantId,
      itemId,
      actorUserId: actor.userId,
      libraryId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
