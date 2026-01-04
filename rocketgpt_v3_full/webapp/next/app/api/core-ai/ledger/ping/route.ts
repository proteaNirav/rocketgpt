export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import crypto from "crypto";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { NextRequest, NextResponse } from "next/server";

import { writeDecisionEntry, writeDecisionOutcome } from "@/lib/core-ai/decision-ledger/writer";
import { ensureRunDirs, getRunLogsDir } from "@/lib/core-ai/run-folders";
export const runtime = "nodejs";


export async function GET(req: NextRequest) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId") ?? crypto.randomUUID();
  const sessionId = url.searchParams.get("sessionId") ?? undefined;

  const decisionId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Local-first: ensure run folders exist before writing
  await ensureRunDirs(runId);

  await writeDecisionEntry({
    decision_id: decisionId,
    run_id: runId,
    session_id: sessionId,
    step: "core-ai/ledger/ping",

    cat_id: "core",
    cat_version: "0.0.0",
    device_mode: "cloud",

    agent: "system",
    decision_type: "info",
    intent: "Ledger ping",

    inputs_summary: "Ping endpoint invoked to validate JSONL ledger writing.",
    evidence: { endpoint: "/api/core-ai/ledger/ping" },
    constraints: { local_first: true },

    risk_score: 0,
    confidence_score: 1,

    decision: "allow",
    reasoning: "This is a non-invasive health check for Decision Ledger plumbing.",

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
    side_effects: { notes: "Wrote decision entry + outcome to JSONL ledger." },
    human_intervention: false,
    evaluated_at: now,
  });

  return NextResponse.json({
    success: true,
    runId,
    decisionId,
    ledgerDir: getRunLogsDir(runId),
    message: "Decision Ledger ping recorded (JSONL).",
  });
}
