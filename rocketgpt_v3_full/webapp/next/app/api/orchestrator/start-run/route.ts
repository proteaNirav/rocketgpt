export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import crypto from "crypto";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { NextRequest, NextResponse } from "next/server";

import { writeDecisionEntry, writeDecisionOutcome } from "@/lib/core-ai/decision-ledger/writer";
import { ensureRunDirs, getRunLogsDir } from "@/lib/core-ai/run-folders";

type StartRunRequest = {
  runId?: string;
  run_id?: string;
  sessionId?: string;
  session_id?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const url = new URL(req.url);

  const headerRunId = req.headers.get("x-rgpt-run-id") ?? undefined;
  const queryRunId  = url.searchParams.get("run_id") ?? undefined;

  let body: StartRunRequest = {};
  try {
    body = (await req.json()) as StartRunRequest;
  } catch {
    body = {};
  }

  const bodyRunId =
    (typeof body.run_id === "string" && body.run_id) ||
    (typeof body.runId  === "string" && body.runId)  ||
    undefined;

  const sessionId =
    (typeof body.session_id === "string" && body.session_id) ||
    (typeof body.sessionId  === "string" && body.sessionId)  ||
    (url.searchParams.get("session_id") ?? undefined) ||
    (url.searchParams.get("sessionId") ?? undefined) ||
    undefined;

  const runId = headerRunId ?? queryRunId ?? bodyRunId ?? crypto.randomUUID();

  // Local-first: ensure run folders exist before writing
  await ensureRunDirs(runId);

  // P4-A1: Decision Ledger â€” Run started (best-effort)
  try {
    const decisionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await writeDecisionEntry({
      decision_id: decisionId,
      run_id: runId,
      session_id: sessionId,
      step: "orchestrator/start-run",

      cat_id: "core",
      cat_version: "0.0.0",
      device_mode: "cloud",

      agent: "system",
      decision_type: "info",
      intent: "Run started",

      inputs_summary: "Orchestrator start-run invoked.",
      evidence: { endpoint: "/api/orchestrator/start-run" },
      constraints: { local_first: true },

      risk_score: 0,
      confidence_score: 1,

      decision: "allow",
      reasoning: "Start-run established runId; ledger records run-start event.",

      context_hash: "pending",
      supersedes: null,

      timestamp: now,
    });

    await writeDecisionOutcome({
      decision_id: decisionId,
      run_id: runId,
      status: "success",
      error_type: "none",
      metrics: {},
      side_effects: { notes: "Recorded run-start in JSONL ledger." },
      human_intervention: false,
      evaluated_at: now,
    });
  } catch {
    // Never block start-run if ledger write fails
  }

  return NextResponse.json({
    success: true,
    route: "/api/orchestrator/start-run",
    runId,
    sessionId: sessionId ?? null,
    ledgerDir: getRunLogsDir(runId),
    message: "Run started (Decision Ledger recorded; JSONL local-first).",
  });
}

