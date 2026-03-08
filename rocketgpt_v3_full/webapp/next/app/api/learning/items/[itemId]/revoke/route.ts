import { NextRequest, NextResponse } from "next/server";

import { readLearningActor } from "@/lib/learning/api-auth";
import { reviewLearningItem } from "@/lib/learning/service";
import type { LearningReviewDecision } from "@/lib/db/learningRepo";

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
    const body = await req.json().catch(() => null);
    const mode = String(body?.mode || "revoke").trim().toLowerCase();
    const decision: LearningReviewDecision = mode === "deprecate" ? "deprecate" : "revoke";
    const rationale = body?.rationale ? String(body.rationale) : null;
    const { itemId } = await ctx.params;
    const result = await reviewLearningItem({
      tenantId: actor.tenantId,
      itemId,
      decision,
      rationale,
      actorUserId: actor.userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revoke failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
