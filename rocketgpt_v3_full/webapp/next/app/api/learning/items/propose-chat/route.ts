import { NextRequest, NextResponse } from "next/server";

import { readLearningActor } from "@/lib/learning/api-auth";
import { isLearningWorthyChatText } from "@/lib/learning/chat-heuristics";
import { proposeFromChatIfAllowed } from "@/lib/learning/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  try {
    const actor = readLearningActor(req);
    const body = await req.json().catch(() => null);
    const text = String(body?.text || "").trim();
    const title = String(body?.title || "").trim() || "Chat-derived learning candidate";
    const sourceRef = body?.sourceRef ? String(body.sourceRef) : null;
    const force = body?.force === true;
    if (!text) {
      return NextResponse.json({ error: "text is required." }, { status: 400 });
    }
    if (!force && !isLearningWorthyChatText(text)) {
      return NextResponse.json({ accepted: false, reason: "heuristic_not_matched", itemId: null }, { status: 200 });
    }
    const proposed = await proposeFromChatIfAllowed({
      tenantId: actor.tenantId,
      userId: actor.userId,
      title,
      rawContent: text,
      sourceRef,
    });
    return NextResponse.json(proposed, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to propose from chat." }, { status: 400 });
  }
}
