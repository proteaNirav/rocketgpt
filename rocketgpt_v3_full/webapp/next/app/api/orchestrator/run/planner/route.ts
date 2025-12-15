export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { withOrchestratorHandler } from "../../_utils/orchestratorError";
import { safeModeGuard } from "../../_core/safeMode";
import { enforceControlPlane } from '@/src/control-plane/control-gate';
import { recordDecision } from '@/src/decision-ledger/decision-ledger';
import { ExecutionContext } from '@/src/types/execution-context';

const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY;
const INTERNAL_BASE_URL =
  process.env.RGPT_INTERNAL_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000";

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

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const url = new URL(req.url);

  const headerRunId = req.headers.get("x-rgpt-run-id") ?? undefined;
  const queryRunId = url.searchParams.get("run_id") ?? undefined;

  let body: any = {};
  try {
    body = (await req.json()) as any;
  } catch {
    body = {};
  }

  const bodyRunId: string | undefined = body.run_id ?? body.runId ?? undefined;

  const runId = headerRunId ?? queryRunId ?? bodyRunId ?? crypto.randomUUID();

  // Safe-Mode guard – block orchestrator run/planner when enabled
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
        route: "/api/orchestrator/run/planner",
        runId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized orchestrator access.",
          route: "/api/orchestrator/run/planner",
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
    { route: "/api/orchestrator/run/planner", runId },
    async () => {
      console.log("[ORCH-RUN-PLANNER] Incoming request", {
        route: "/api/orchestrator/run/planner",
        runId,
        bodySummary: summarizeBody(body),
      });

      const plannerBody = {
        ...body,
        run_id: runId,
      };

      const plannerUrl = `${INTERNAL_BASE_URL}/api/planner`;

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

      console.log("[ORCH-RUN-PLANNER] Planner response", {
        route: "/api/orchestrator/run/planner",
        runId,
        status: res.status,
        ok: res.ok,
        bodySummary: summarizeBody(json ?? text),
      });

      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Planner call failed.",
            route: "/api/orchestrator/run/planner",
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
          route: "/api/orchestrator/run/planner",
          runId,
          planner: json,
        },
        { status: 200 }
      );
    }
  );
}






