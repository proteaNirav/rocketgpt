import { NextRequest, NextResponse } from "next/server";

import { getJob } from "@/lib/jobs/queue.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { runId } = await ctx.params;
  const job = getJob(String(runId || "").trim());
  if (!job) return NextResponse.json({ ok: false, error: "runId not found." }, { status: 404 });
  return NextResponse.json({ ok: true, job }, { status: 200 });
}

