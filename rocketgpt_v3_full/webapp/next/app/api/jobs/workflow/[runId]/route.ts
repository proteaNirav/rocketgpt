import { NextRequest, NextResponse } from "next/server";

import { getWorkflowRunWithNodes } from "@/lib/jobs/workflow-engine.mjs";
import { listWorkflowLedgerEvents } from "@/lib/jobs/workflow-ledger.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { runId } = await ctx.params;
  const snapshot = getWorkflowRunWithNodes(runId);
  if (!snapshot) {
    return NextResponse.json({ ok: false, error: "workflow run not found." }, { status: 404 });
  }
  const ledger = listWorkflowLedgerEvents().filter((row) => String(row?.payload?.runId || row?.payload?.workflowRunId || "") === String(runId));
  return NextResponse.json(
    {
      ok: true,
      runId,
      workflowRun: snapshot.workflow,
      nodeRuns: snapshot.nodes,
      ledger,
    },
    { status: 200 }
  );
}

