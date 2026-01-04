import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

// Safe-Mode detection (CI forces this ON; must short-circuit safely)
function _isSafeMode(): boolean {
  const v = (process.env.RGPT_SAFE_MODE ?? process.env.SAFE_MODE ?? process.env.RGPT_RUNTIME_MODE ?? "").toString().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "safe" || v === "safemode";
}

export const runtime = "nodejs";


export interface OrchestratorRouteContext {
  route: string;
  runId?: string;
}

interface SafeModeErrorPayload {
  success: boolean;
  error_code: string;
  message: string;
  capability?: string;
  safe_mode?: boolean;
  timestamp?: string;
  details?: any;
  status?: number;
}

/**
 * Type guard to detect Safe-Mode errors thrown by safeModeGuard().
 */
function isSafeModeError(err: unknown): err is SafeModeErrorPayload {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as any;
  return (
    anyErr.error_code === "SAFE_MODE_ACTIVE" ||
    (anyErr.safe_mode === true && typeof anyErr.message === "string")
  );
}

/**
 * Normalize unknown error objects into a safe JSON payload.
 */
function normalizeError(err: unknown): { message: string; name?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || "Unexpected error",
      name: err.name,
    };
  }

  if (typeof err === "string") {
    return {
      message: err,
    };
  }

  try {
    const asJson = JSON.stringify(err);
    return {
      message: asJson,
    };
  } catch {
    return {
      message: "Unexpected error",
    };
  }
}

/**
 * Wrap a route handler with standardized error logging and response.
 */
async function withOrchestratorHandlerLocal(
  ctx: OrchestratorRouteContext,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (err) {
    // 1) Safe-Mode specific handling â€“ return the error object as-is
    if (isSafeModeError(err)) {
      const safeErr = err as SafeModeErrorPayload;

      const statusCode =
        typeof safeErr.status === "number" && safeErr.status >= 400
          ? safeErr.status
          : 403;

      console.warn("[ORCH-ROUTE-SAFEMODE]", {
        route: ctx.route,
        runId: ctx.runId,
        error: safeErr,
      });

      return NextResponse.json(safeErr, { status: statusCode });
    }

    // 2) Generic error handling (existing behaviour)
    const errorPayload = normalizeError(err);

    // Server-side log for observability
    console.error(
      "[ORCH-ROUTE-ERROR]",
      {
        route: ctx.route,
        runId: ctx.runId,
        error: errorPayload,
      },
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: errorPayload,
        route: ctx.route,
        runId: ctx.runId ?? null,
      },
      { status: 403 }
    );
  }
}

/**
 * Route handler: POST /api/orchestrator/builder/execute-all
 * - Internal auth: x-rgpt-internal must match process.env.RGPT_INTERNAL_KEY
 * - Safe-Mode: if RGPT_SAFE_MODE_ENABLED=true -> return 403 SAFE_MODE_ACTIVE
 */
export async function POST(req: NextRequest) {
  // CI forces Safe-Mode ON; must block with clean 4xx (no crashes)
  if (typeof _isSafeMode === "function" && _isSafeMode()) {
    return NextResponse.json({ ok: false, error: "SAFE_MODE_ACTIVE" }, { status: 403 });
  }

  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  return withOrchestratorHandlerLocal(
    { route: "/api/orchestrator/builder/execute-all" },
    async () => {
      // --- Internal auth ---
      const expected = process.env.RGPT_INTERNAL_KEY || "";
      const provided = req.headers.get("x-rgpt-internal") || "";

      if (!expected || provided !== expected) {
        return NextResponse.json(
          {
            success: false,
            error_code: "INTERNAL_AUTH_REQUIRED",
            message: "Missing or invalid internal auth header (x-rgpt-internal).",
            status: 401,
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // --- Safe-Mode gate ---
      const safeModeEnabled =
        (process.env.RGPT_SAFE_MODE_ENABLED || "").toLowerCase() === "true";

      if (safeModeEnabled) {
        return NextResponse.json(
          {
            success: false,
            error_code: "SAFE_MODE_ACTIVE",
            message: "Safe-Mode is enabled. This capability is blocked.",
            capability: "builder.execute_all",
            safe_mode: true,
            status: 403,
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }
      // --- Input validation ---
      let body: any;
      try {
        body = await req.json();
      } catch (err) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Request body must be valid JSON.",
            },
          },
          { status: 400 }
        );
      }

      if (
        typeof body.runId !== "number" ||
        !Number.isFinite(body.runId) ||
        body.runId <= 0
      ) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "Field 'runId' must be a positive number.",
            },
          },
          { status: 400 }
        );
      }
      // --- Normal execution path (stub) ---
      return NextResponse.json(
        { success: true, message: "execute-all allowed (safe-mode disabled)." },
        { status: 200 }
      );
    }
  );
}

