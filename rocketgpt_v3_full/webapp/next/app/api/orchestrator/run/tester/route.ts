export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { withOrchestratorHandler } from "../../_utils/orchestratorError";
import { safeModeGuard } from "../../_core/safeMode";
import { safeParseJson, pickRunId, buildProxyBody } from "../../_core/dispatchGuard";
export const runtime = "nodejs";


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
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const body = await safeParseJson(req);
  const runId = pickRunId(req, body);
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
      const route = "/api/orchestrator/run/tester";
      const bodySummary = summarizeBody(body);
      const preflight = await governancePreflightBestEffort({
        runId,
        route,
        capability: "run-tester",
        inputs_summary: "Orchestrator run/tester invoked.",
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
          capability: "run-tester",
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

      console.log("[ORCH-RUN-TESTER] Incoming request", {
        route,
        runId,
        bodySummary,
      });

      const testerBody = buildProxyBody(body, runId);

      const testerUrl = `${INTERNAL_BASE_URL}/api/tester/run`;
      let responseSummary = "[not executed]";
      let httpStatus = 500;
      let outcome = "error";

      try {
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

        responseSummary = summarizeBody(json ?? text);
        httpStatus = res.status;
        outcome = res.ok ? "success" : "error";

        console.log("[ORCH-RUN-TESTER] Tester response", {
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
              message: "Tester call failed.",
              route,
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
            route,
            runId,
            tester: json,
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
          capability: "run-tester",
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
