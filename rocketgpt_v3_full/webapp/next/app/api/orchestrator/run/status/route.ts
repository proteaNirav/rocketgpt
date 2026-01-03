import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * GET /api/orchestrator/run/status
 * -------------------------------
 * Operational endpoint used by smoke tests and basic status checks.
 * This route intentionally returns a stable envelope even when no runId
 * is provided, so the orchestrator surface remains inspectable.
 *
 * If your system later supports querying a specific runId, extend this
 * to accept ?runId=... and return run status details.
 */
export async function GET(req: Request) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId");

  // Minimal safe response; does not disclose secrets
  return Response.json({
    success: true,
    route: "/api/orchestrator/run/status",
    runId: runId ?? null,
    message: runId
      ? "Run status query is not yet implemented; extend this endpoint to read run state."
      : "Orchestrator run status endpoint is operational.",
    timestamp: new Date().toISOString(),
  });
}
