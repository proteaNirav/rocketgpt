import { NextRequest, NextResponse } from "next/server";
import { clearOverrides, getOverrides, setOverride } from "@/lib/intelligence/overrides-store.mjs";
import { readLearningActor } from "@/lib/learning/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readIds(req: NextRequest, body: any) {
  const actor = readLearningActor(req);
  return {
    tenantId: String(body?.tenantId || req.nextUrl.searchParams.get("tenantId") || actor.tenantId),
    chatId: String(body?.chatId || body?.sessionId || req.nextUrl.searchParams.get("chatId") || ""),
  };
}

export async function GET(req: NextRequest) {
  const ids = readIds(req, {});
  if (!ids.chatId) {
    return NextResponse.json({ ok: false, error: "chatId is required." }, { status: 400 });
  }
  const overrides = getOverrides(ids.tenantId, ids.chatId);
  return NextResponse.json({ ok: true, overrides });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids = readIds(req, body);
  if (!ids.chatId) {
    return NextResponse.json({ ok: false, error: "chatId is required." }, { status: 400 });
  }
  const patch = body?.patch || {};
  const ttlMs = Number(body?.ttlMs || 24 * 60 * 60 * 1000);
  const updated = setOverride(ids.tenantId, ids.chatId, patch, ttlMs);
  return NextResponse.json({ ok: true, overrides: updated });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const ids = readIds(req, body || {});
  if (!ids.chatId) {
    return NextResponse.json({ ok: false, error: "chatId is required." }, { status: 400 });
  }
  clearOverrides(ids.tenantId, ids.chatId);
  return NextResponse.json({ ok: true, cleared: true });
}
