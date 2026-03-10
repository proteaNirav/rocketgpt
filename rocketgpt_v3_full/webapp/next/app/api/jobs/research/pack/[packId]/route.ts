import { NextRequest, NextResponse } from "next/server";

import { getEvidencePackById } from "@/lib/jobs/research-layer.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ packId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { packId } = await ctx.params;
  const pack = getEvidencePackById(packId);
  if (!pack) {
    return NextResponse.json({ ok: false, error: "EvidencePack not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, evidencePack: pack }, { status: 200 });
}

