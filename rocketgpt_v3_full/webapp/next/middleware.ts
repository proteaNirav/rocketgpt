import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RUNTIME_ALLOWLIST = new Set<string>([
  "/api/approvals/create",
  "/api/approvals/update-status",
  "/api/builder",
  "/api/core/[...path]",
  "/api/core-ai/ledger/ping",
  "/api/debug-auth",
  "/api/demo/chat",
  "/api/demo/orchestrator/status",
  "/api/demo/self-study",
  "/api/demo/upload",
  "/api/edge/[fn]",
  "/api/edge/echo",
  "/api/edge/ping",
  "/api/env",
  "/api/guest",
  "/api/health",
  "/api/limits",
  "/api/llm",
  "/api/logs",
  "/api/orchestrator/admin/safe-mode",
  "/api/orchestrator/admin/safe-mode/disable",
  "/api/orchestrator/admin/safe-mode/enable",
  "/api/orchestrator/auto-advance",
  "/api/orchestrator/build",
  "/api/orchestrator/builder",
  "/api/orchestrator/builder/execute-all",
  "/api/orchestrator/builder/execute-next",
  "/api/orchestrator/builder/list",
  "/api/orchestrator/clear-cache",
  "/api/orchestrator/config",
  "/api/orchestrator/health",
  "/api/orchestrator/health/basic",
  "/api/orchestrator/health/deep",
  "/api/orchestrator/info",
  "/api/orchestrator/logs",
  "/api/orchestrator/plan",
  "/api/orchestrator/planner/run",
  "/api/orchestrator/release",
  "/api/orchestrator/run",
  "/api/orchestrator/run/builder",
  "/api/orchestrator/run/finalize",
  "/api/orchestrator/run/planner",
  "/api/orchestrator/run/status",
  "/api/orchestrator/run/tester",
  "/api/orchestrator/run-history",
  "/api/orchestrator/safe-mode",
  "/api/orchestrator/start-run",
  "/api/orchestrator/status",
  "/api/orchestrator/test",
  "/api/orchestrator/tester/execute",
  "/api/orchestrator/test-tester",
  "/api/planner",
  "/api/planner/plan",
  "/api/plans",
  "/api/report-error",
  "/api/self-improve/run",
  "/api/self-improve/status",
  "/api/sessions",
  "/api/status",
  "/api/suggest",
  "/api/suggestions/[issue]/approve",
  "/api/suggestions/[issue]/reject",
  "/api/tester/health",
  "/api/tester/run",
  "/api/usage",
  "/api/version"
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();

  if (!RUNTIME_ALLOWLIST.has(pathname)) {
    const res = new NextResponse("Not Found", { status: 404 });
    if (process.env.NODE_ENV !== "production") {
      res.headers.set("x-rgpt-deny-reason", "route-not-allowlisted");
      res.headers.set("x-rgpt-path", pathname);
    }
    return res;
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
