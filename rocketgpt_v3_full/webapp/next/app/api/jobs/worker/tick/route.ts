import { NextRequest, NextResponse } from "next/server";

import { JOB_TYPES } from "@/lib/jobs/queue.mjs";
import { processOneJob } from "@/lib/jobs/worker.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(Object.values(JOB_TYPES));

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const jobType = String(body?.jobType || "").trim();
  if (!ALLOWED_TYPES.has(jobType)) {
    return NextResponse.json({ ok: false, error: "Unsupported jobType." }, { status: 400 });
  }

  try {
    const result = await processOneJob(jobType, { workerId: "worker-api" });
    return NextResponse.json({ ok: true, processed: !!result, result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process job.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

