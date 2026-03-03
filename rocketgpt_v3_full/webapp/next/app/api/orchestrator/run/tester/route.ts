export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { withOrchestratorHandler } from "../../_utils/orchestratorError";
import { safeModeGuard } from "../../_core/safeMode";
import { safeParseJson, pickRunId, buildProxyBody } from "../../_core/dispatchGuard";
export const runtime = "nodejs";


const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY;
const ROUTE = "/api/orchestrator/run/tester";

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
      "[ORCH-RUN-TESTER] RGPT_INTERNAL_KEY is not set. Route is running without header enforcement."
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

      const testerUrl = `${baseUrl}/api/tester/run`;
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
