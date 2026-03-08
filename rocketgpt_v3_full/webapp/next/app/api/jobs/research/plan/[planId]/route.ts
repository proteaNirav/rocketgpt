import { NextRequest, NextResponse } from "next/server";

import { getEvidencePackByPlanId } from "@/lib/jobs/research-layer.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ planId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { planId } = await ctx.params;
  const pack = getEvidencePackByPlanId(planId);
  if (!pack) {
    return NextResponse.json({ ok: false, error: "EvidencePack not found for planId." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, evidencePack: pack }, { status: 200 });
}

