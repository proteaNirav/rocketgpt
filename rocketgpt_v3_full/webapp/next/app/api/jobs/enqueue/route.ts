import { NextRequest, NextResponse } from "next/server";

import { JOB_TYPES, enqueue } from "@/lib/jobs/queue.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(Object.values(JOB_TYPES));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const jobType = String(body?.jobType || "").trim();
  if (!ALLOWED_TYPES.has(jobType)) {
    return NextResponse.json({ ok: false, error: "Unsupported jobType." }, { status: 400 });
  }

  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  const maxRetries = Number.isInteger(body?.maxRetries) ? Number(body.maxRetries) : 1;

  try {
    const queued = enqueue(jobType, payload, { maxRetries });
    return NextResponse.json(
      {
        ok: true,
        runId: queued.runId,
        status: queued.status,
        telemetry: queued.telemetry,
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to enqueue job.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

