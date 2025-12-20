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

  // Safe-Mode guard – block orchestrator run/tester when enabled
  try {
    safeModeGuard("run-tester");
  } catch (err: any) {
    const statusCode = typeof err?.status === "number" ? err.status : 503;
    return NextResponse.json(err, { status: statusCode });
  }

  // Internal security check
  const internalKeyHeader = req.headers.get("x-rgpt-internal");

  if (INTERNAL_KEY) {
    if (!internalKeyHeader || internalKeyHeader !== INTERNAL_KEY) {
      console.warn("[ORCH-RUN-TESTER] Unauthorized access attempt.", {
        route: "/api/orchestrator/run/tester",
        runId,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized orchestrator access.",
          route: "/api/orchestrator/run/tester",
          runId,
        },
        { status: 401 }
      );
    }
  } else {
    console.warn(
      "[ORCH-RUN-TESTER] RGPT_INTERNAL_KEY is not set. Route is running without header enforcement."
    );
  }

  return withOrchestratorHandler(
    { route: "/api/orchestrator/run/tester", runId },
    async () => {
      console.log("[ORCH-RUN-TESTER] Incoming request", {
        route: "/api/orchestrator/run/tester",
        runId,
        bodySummary: summarizeBody(body),
      });

      const testerBody = {
        ...body,
        run_id: runId,
      };

      const testerUrl = `${INTERNAL_BASE_URL}/api/tester/run`;

      const res = await fetch(testerUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(INTERNAL_KEY
            ? { "x-rgpt-internal": INTERNAL_KEY }
            : {}),
        },
        body: JSON.stringify(testerBody),
      });

      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // Not valid JSON, keep raw text
      }

      console.log("[ORCH-RUN-TESTER] Tester response", {
        route: "/api/orchestrator/run/tester",
        runId,
        status: res.status,
        ok: res.ok,
        bodySummary: summarizeBody(json ?? text),
      });

      if (!res.ok) {
        return NextResponse.json(
          {
            success: false,
            message: "Tester call failed.",
            route: "/api/orchestrator/run/tester",
            runId,
            status: res.status,
            testerRaw: json ?? text,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Tester run executed via orchestrator run endpoint.",
          route: "/api/orchestrator/run/tester",
          runId,
          tester: json,
        },
        { status: 200 }
      );
    }
  );
}
