import crypto from "crypto";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { writeDecisionEntry, writeDecisionOutcome } from "@/lib/core-ai/decision-ledger/writer";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { withOrchestratorHandler } from "../../_utils/orchestratorError";
import { safeModeGuard } from "../../_core/safeMode";
import { safeParseJson, pickRunId, buildProxyBody } from "../../_core/dispatchGuard";
import { enforceControlPlane } from '@/src/control-plane/control-gate';
import { recordDecision } from '@/src/decision-ledger/decision-ledger';
import { ExecutionContext } from '@/src/types/execution-context';
export const runtime = "nodejs";


const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY;
const ROUTE = "/api/orchestrator/run/planner";

function summarizeBody(body: unknown): string {
  try {
    const asString =
      typeof body === "string" ? body : JSON.stringify(body);
    if (asString.length > 5000) {
      return asString.slice(0, 5000) + "...[truncated]";
    }
    return asString;
  } catch {
    return "[unserializable body]";
  }
}

function guardFailResponse(err: any, route: string, runId?: string): NextResponse {
  const message = typeof err?.message === "string" ? err.message : "Runtime guard blocked request.";
  const name = typeof err?.name === "string" ? err.name : undefined;
  const isUpstreamFetchFailure =
    message.includes("fetch failed") || name === "TypeError";
  if (isUpstreamFetchFailure) {
    return NextResponse.json(
      {
        success: false,
        route,
        runId: runId ?? null,
        error_code: "UPSTREAM_FETCH_FAILED",
        message: "Upstream fetch failed",
        details: { name, message },
      },
      { status: 502 }
    );
  }

  const statusFromError = typeof err?.status === "number" ? err.status : undefined;
  const status =
    statusFromError === 400 || statusFromError === 401 || statusFromError === 403
      ? statusFromError
      : message.startsWith("RGPT_GUARD_BLOCK:")
        ? 403
        : message.includes("MISSING_DECISION_ID")
          ? 400
          : 403;

  const error_code = message.includes("MISSING_DECISION_ID")
    ? "MISSING_DECISION_ID"
    : message.startsWith("RGPT_GUARD_BLOCK:")
      ? "RGPT_GUARD_BLOCK"
      : "RUNTIME_GUARD_FAILED";

  return NextResponse.json(
    {
      success: false,
      route,
      runId: runId ?? null,
      error_code,
      message,
      ...(err?.details !== undefined ? { details: err.details } : {}),
    },
    { status }
  );
}

/**
 * Governance helpers (dynamic import to avoid build-time coupling).
 * Best-effort: never crash the route if governance logger fails.
 */
async function governancePreflightBestEffort(input: any): Promise<any | null> {
  try {
    const mod: any = await import("@/lib/governance/governance-service");
    const fn = mod?.governancePreflight ?? mod?.evaluateGovernancePreflight;
    if (typeof fn !== "function") return null;
    return await fn(input);
  } catch {
    return null;
  }
}

async function governancePostRunBestEffort(input: any): Promise<void> {
  try {
    const mod: any = await import("@/lib/governance/governance-service");
    const fn = mod?.governancePostRun ?? mod?.postRun ?? mod?.evaluateGovernancePostRun;
    if (typeof fn !== "function") return;
    await fn(input);
  } catch {
    // swallow
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const origin = new URL(req.url).origin;
  const baseUrl = process.env.INTERNAL_BASE_URL?.trim()
    ? process.env.INTERNAL_BASE_URL.trim()
    : origin;
  const runIdFromGuardContext = pickRunId(req, {});
  try {
    await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  } catch (err: any) {
    return guardFailResponse(err, ROUTE, runIdFromGuardContext);
  }
  // [CONTROL-PLANE] V1 gate (pass-through)
  const executionContext: ExecutionContext = {
    executionId: crypto.randomUUID(),
    tenantId: 'default',

    // Decision authority (V1 default, non-enforcing)
    decisionContract: {
      contractId: 'decision-default',
      tenantId: 'default',
      type: 'DECISION',
      purpose: 'Default Decision Contract (V1)',
      orgGoalAlignment: ['secure', 'auditable', 'cost-efficient'],
      canApprove: true,
      canExecute: false,
      validFrom: new Date().toISOString(),

      // Token governance (REFERENCE ONLY)
      tokenBudget: {
        maxTokensPerRun: 8000,
        maxTokensPerDay: 50000,
        warningThresholdPct: 80
      },

      approvalThreshold: 'SINGLE',
      escalationAllowed: true
    },

    contractId: undefined,
    requestedBy: 'api',
    requestedAt: new Date().toISOString(),
    purpose: 'orchestrator-api-call'
  };
  // [PLANNER-LEDGER] Log planner execution start (auth already passed)
  recordDecision(executionContext, {
    executionId: executionContext.executionId,
    allowed: true,
    reason: 'Planner execution started',
    recordedAt: new Date().toISOString()
  });


  const control = enforceControlPlane(executionContext);
  recordDecision(executionContext, {
    executionId: executionContext.executionId,
    allowed: control.allowed,
    reason: control.reason,
    recordedAt: new Date().toISOString()
  });

  if (!control.allowed) {
    return NextResponse.json({ success: false, error: control.reason ?? 'Blocked by Control Plane' }, { status: 403 });
  }
  const body = await safeParseJson(req);
  const runId = pickRunId(req, body);
  try {
    const __ledgerDecisionId = crypto.randomUUID();
    const __ledgerNow = new Date().toISOString();

    await writeDecisionEntry({
      decision_id: __ledgerDecisionId,
      run_id: runId,
      session_id: undefined,
      step: "orchestrator/run/planner",

      cat_id: "core",
      cat_version: "0.0.0",
      device_mode: "cloud",

      agent: "system",
      decision_type: "info",
      intent: "Planner run started",

      inputs_summary: "Orchestrator run/planner invoked.",
      evidence: { endpoint: "/api/orchestrator/run/planner" },
      constraints: { local_first: true },

      risk_score: 0,
      confidence_score: 1,

      decision: "allow",
      reasoning: "Ledger records the planner execution start event.",
      context_hash: "pending",
      supersedes: null,

      timestamp: __ledgerNow,
    });

    await writeDecisionOutcome({
      decision_id: __ledgerDecisionId,
      run_id: runId,
      status: "success",
      error_type: "none",
      metrics: {},
      side_effects: { notes: "Recorded planner start event in JSONL ledger." },
      human_intervention: false,
      evaluated_at: __ledgerNow,
    });
  } catch {
    // Never block planner if ledger write fails
  }
  try {
    safeModeGuard("run-planner");
  } catch (err: any) {
    const statusCode = typeof err?.status === "number" ? err.status : 503;
    return NextResponse.json(err, { status: statusCode });
  }

  // Internal security check
  const internalKeyHeader = req.headers.get("x-rgpt-internal");

  if (INTERNAL_KEY) {
    if (!internalKeyHeader || internalKeyHeader !== INTERNAL_KEY) {
      console.warn("[ORCH-RUN-PLANNER] Unauthorized access attempt.", {
        route: ROUTE,
        runId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized orchestrator access.",
          route: ROUTE,
          runId,
        },
        { status: 401 }
      );
    }
  } else {
    console.warn(
      "[ORCH-RUN-PLANNER] RGPT_INTERNAL_KEY is not set. Route is running without header enforcement."
    );
  }

  return withOrchestratorHandler(
    { route: ROUTE, runId },
    async () => {
      const route = ROUTE;
      const bodySummary = summarizeBody(body);
      const preflight = await governancePreflightBestEffort({
        runId,
        route,
        capability: "run-planner",
        inputs_summary: "Orchestrator run/planner invoked.",
        body_summary: bodySummary,
      });

      const rawAction =
        preflight?.decision ??
        preflight?.action ??
        preflight?.result?.decision ??
        preflight?.result?.action ??
        preflight?.result ??
        "allow";
      const action = (typeof rawAction === "string" ? rawAction : "allow").toLowerCase();

      if (["block", "deny", "contain"].includes(action)) {
        await governancePostRunBestEffort({
          runId,
          route,
          capability: "run-planner",
          outcome: "blocked",
          http_status: 403,
          response_summary: "Blocked by Governance Preflight.",
          preflight,
          when: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            route,
            runId,
            error_code: "GOVERNANCE_BLOCKED",
            message: "Blocked by Governance Preflight.",
            action,
            preflight,
          },
          { status: 403 }
        );
      }

      console.log("[ORCH-RUN-PLANNER] Incoming request", {
        route,
        runId,
        bodySummary,
      });

      const plannerBody = buildProxyBody(body, runId);

      const plannerUrl = `${baseUrl}/api/planner`;
      let responseSummary = "[not executed]";
      let httpStatus = 500;
      let outcome = "error";

      try {
        const res = await fetch(plannerUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(INTERNAL_KEY
              ? { "x-rgpt-internal": INTERNAL_KEY }
              : {}),
          },
          body: JSON.stringify(plannerBody),
        });

        const text = await res.text();
        let json: any = null;

        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          // Not valid JSON, keep raw text
        }

        responseSummary = summarizeBody(json ?? text);
        httpStatus = res.status;
        outcome = res.ok ? "success" : "error";

        console.log("[ORCH-RUN-PLANNER] Planner response", {
          route,
          runId,
          status: res.status,
          ok: res.ok,
          bodySummary: responseSummary,
        });

        if (!res.ok) {
          return NextResponse.json(
            {
              success: false,
              message: "Planner call failed.",
              route,
              runId,
              status: res.status,
              plannerRaw: json ?? text,
            },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            success: true,
            message: "Planner plan generated via orchestrator run endpoint.",
            route,
            runId,
            planner: json,
          },
          { status: 200 }
        );
      } catch (err: any) {
        responseSummary = summarizeBody(err?.message ?? err ?? "Unknown fetch error");
        httpStatus = 500;
        outcome = "error";
        throw err;
      } finally {
        await governancePostRunBestEffort({
          runId,
          route,
          capability: "run-planner",
          outcome,
          http_status: httpStatus,
          response_summary: responseSummary,
          preflight,
          when: new Date().toISOString(),
        });
      }
    }
  );
}



