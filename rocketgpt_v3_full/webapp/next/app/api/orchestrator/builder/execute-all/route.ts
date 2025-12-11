export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { withOrchestratorHandler } from "../../_utils/orchestratorError";
import { safeModeGuard } from "../../_core/safeMode";

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

  // Safe-Mode check: if active, block immediately with structured error
  try {
    safeModeGuard("builder-execute-all");
  } catch (err: any) {
    const statusCode = typeof err?.status === "number" ? err.status : 503;
    return NextResponse.json(err, { status: statusCode });
  }

  // Internal security check
  const internalKeyHeader = req.headers.get("x-rgpt-internal");

  if (INTERNAL_KEY) {
    if (!internalKeyHeader || internalKeyHeader !== INTERNAL_KEY) {
      console.warn("[ORCH-BUILDER-EXEC-ALL] Unauthorized access attempt.", {
        route: "/api/orchestrator/builder/execute-all",
        runId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized orchestrator access.",
          route: "/api/orchestrator/builder/execute-all",
          runId,
        },
        { status: 401 }
      );
    }
  } else {
    console.warn(
      "[ORCH-BUILDER-EXEC-ALL] RGPT_INTERNAL_KEY is not set. Route is running without header enforcement."
    );
  }

  return withOrchestratorHandler(
    { route: "/api/orchestrator/builder/execute-all", runId },
    async () => {
      console.log("[ORCH-BUILDER-EXEC-ALL] Incoming request", {
        route: "/api/orchestrator/builder/execute-all",
        runId,
        bodySummary: summarizeBody(body),
      });

      // 1) Call orchestrator run/planner
      const plannerUrl = `${INTERNAL_BASE_URL}/api/orchestrator/run/planner`;
      const plannerBody = {
        ...body,
        run_id: runId,
      };

      const plannerRes = await fetch(plannerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(INTERNAL_KEY
            ? { "x-rgpt-internal": INTERNAL_KEY }
            : {}),
        },
        body: JSON.stringify(plannerBody),
      });

      const plannerText = await plannerRes.text();
      let plannerJson: any = null;
      try {
        plannerJson = plannerText ? JSON.parse(plannerText) : null;
      } catch {
        // leave as text
      }

      console.log("[ORCH-BUILDER-EXEC-ALL] Planner leg response", {
        route: "/api/orchestrator/builder/execute-all",
        runId,
        status: plannerRes.status,
        ok: plannerRes.ok,
        bodySummary: summarizeBody(plannerJson ?? plannerText),
      });

      if (!plannerRes.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Planner leg failed in execute-all.",
            route: "/api/orchestrator/builder/execute-all",
            runId,
            status: plannerRes.status,
            planner: plannerJson ?? plannerText,
          },
          { status: 502 }
        );
      }

      // 2) Call orchestrator run/tester
      const testerUrl = `${INTERNAL_BASE_URL}/api/orchestrator/run/tester`;
      const testerBody = {
        run_id: runId,
      };

      const testerRes = await fetch(testerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(INTERNAL_KEY
            ? { "x-rgpt-internal": INTERNAL_KEY }
            : {}),
        },
        body: JSON.stringify(testerBody),
      });

      const testerText = await testerRes.text();
      let testerJson: any = null;
      try {
        testerJson = testerText ? JSON.parse(testerText) : null;
      } catch {
        // leave as text
      }

      console.log("[ORCH-BUILDER-EXEC-ALL] Tester leg response", {
        route: "/api/orchestrator/builder/execute-all",
        runId,
        status: testerRes.status,
        ok: testerRes.ok,
        bodySummary: summarizeBody(testerJson ?? testerText),
      });

      if (!testerRes.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Tester leg failed in execute-all.",
            route: "/api/orchestrator/builder/execute-all",
            runId,
            status: testerRes.status,
            planner: plannerJson ?? plannerText,
            tester: testerJson ?? testerText,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Orchestrator execute-all completed successfully.",
          route: "/api/orchestrator/builder/execute-all",
          runId,
          planner: plannerJson,
          tester: testerJson,
        },
        { status: 200 }
      );
    }
  );
}
