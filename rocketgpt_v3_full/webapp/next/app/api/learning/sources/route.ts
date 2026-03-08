import { NextRequest, NextResponse } from "next/server";

import { createLearningSource, listLearningSources, type LearningSourceKind } from "@/lib/db/learningRepo";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    const items = await listLearningSources(actor.tenantId);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to list sources." }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    if (!actor.isAdmin) {
      return NextResponse.json({ error: "Admin token required." }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const kind = String(body?.kind || "").trim() as LearningSourceKind;
    const name = String(body?.name || "").trim();
    const sourceUrl = body?.sourceUrl === null || body?.sourceUrl === undefined ? null : String(body.sourceUrl).trim();
    const enabled = body?.enabled === undefined ? true : Boolean(body.enabled);
    const intervalMinutes = Math.max(5, Math.min(10080, Number(body?.intervalMinutes ?? 360)));

    if (!(kind === "rss" || kind === "chat")) {
      return NextResponse.json({ error: "kind must be rss or chat." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name is required." }, { status: 400 });
    }
    if (kind === "rss" && !sourceUrl) {
      return NextResponse.json({ error: "sourceUrl is required for rss source." }, { status: 400 });
    }
    const created = await createLearningSource({
      tenantId: actor.tenantId,
      kind,
      name,
      sourceUrl,
      enabled,
      intervalMinutes,
      createdByUserId: actor.userId,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create source.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
