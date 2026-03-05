import { NextRequest, NextResponse } from "next/server";

import { ALLOWED_EDIT_STATUSES } from "@/lib/cats/lifecycle";
import { canWriteAsOwnerOrAdmin, readActor } from "@/lib/cats/api-auth";
import { recordCatsLedgerEvent } from "@/lib/cats/ledger";
import { getCatById, updateCat } from "@/lib/db/catsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ catId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readActor(req);
    const { catId } = await ctx.params;
    const cat = await getCatById(actor.tenantId, catId);
    if (!cat) return NextResponse.json({ error: "CAT not found." }, { status: 404 });
    return NextResponse.json(cat, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load CAT." }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const actor = readActor(req);
    const { catId } = await ctx.params;
    const current = await getCatById(actor.tenantId, catId);
    if (!current) return NextResponse.json({ error: "CAT not found." }, { status: 404 });
    if (!canWriteAsOwnerOrAdmin(actor, current.owner_user_id)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (!ALLOWED_EDIT_STATUSES.has(current.status)) {
      return NextResponse.json({ error: "Metadata edits allowed only in draft/review." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = body?.name === undefined ? undefined : String(body.name || "").trim();
    const description = body?.description === undefined ? undefined : String(body.description || "").trim();
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "name cannot be empty." }, { status: 400 });
    }

    const updated = await updateCat({
      tenantId: actor.tenantId,
      catId,
      name,
      description: description === undefined ? undefined : description || null,
    });
    if (!updated) return NextResponse.json({ error: "CAT not found." }, { status: 404 });

    await recordCatsLedgerEvent({
      actor: { userId: actor.userId, isAdmin: actor.isAdmin, tenantId: actor.tenantId },
      catId: updated.id,
      action: "cats.update",
      beforeStatus: current.status,
      afterStatus: updated.status,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update CAT.";
    const status = message.toLowerCase().includes("duplicate") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
