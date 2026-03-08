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
    const { itemId } = await ctx.params;
    const body = await req.json().catch(() => null);
    const decision = String(body?.decision || "").trim().toLowerCase() as LearningReviewDecision;
    const rationale = body?.rationale ? String(body.rationale) : null;
    if (!(decision === "approve" || decision === "reject" || decision === "deprecate" || decision === "revoke")) {
      return NextResponse.json({ error: "decision must be approve|reject|deprecate|revoke." }, { status: 400 });
    }
    const result = await reviewLearningItem({
      tenantId: actor.tenantId,
      itemId,
      decision,
      rationale,
      actorUserId: actor.userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
