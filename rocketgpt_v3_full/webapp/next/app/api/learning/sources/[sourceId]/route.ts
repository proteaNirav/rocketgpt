import { NextRequest, NextResponse } from "next/server";

import { getLearningSourceById, updateLearningSource } from "@/lib/db/learningRepo";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readLearningActor(req);
    if (!actor.isAdmin) {
      return NextResponse.json({ error: "Admin token required." }, { status: 401 });
    }
    const { sourceId } = await ctx.params;
    const existing = await getLearningSourceById(actor.tenantId, sourceId);
    if (!existing) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }
    const body = await req.json().catch(() => null);
    const patch: Record<string, unknown> = {};
    if (body?.name !== undefined) patch.name = String(body.name || "").trim();
    if (body?.sourceUrl !== undefined) patch.source_url = body.sourceUrl ? String(body.sourceUrl) : null;
    if (body?.enabled !== undefined) patch.enabled = Boolean(body.enabled);
    if (body?.intervalMinutes !== undefined) {
      const n = Number(body.intervalMinutes);
      patch.interval_minutes = Number.isFinite(n) ? Math.max(5, Math.min(10080, Math.floor(n))) : existing.interval_minutes;
    }
    const updated = await updateLearningSource({
      tenantId: actor.tenantId,
      sourceId,
      patch,
    });
    if (!updated) return NextResponse.json({ error: "Source not found." }, { status: 404 });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update source." }, { status: 400 });
  }
}
