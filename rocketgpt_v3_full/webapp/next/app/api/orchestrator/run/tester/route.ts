import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Extract runId from either:
 * - JSON body: { runId } or { run_id } or { id }
 * - Query string: ?runId= or ?run_id=
 */
async function extractRunId(req: NextRequest): Promise<number | null> {
  let raw: unknown = null;

  // 1) Try query string first (works well for manual tests)
  const url = new URL(req.url);
  const search = url.searchParams;
  const fromQuery =
    search.get("runId") ??
    search.get("run_id") ??
    null;

  if (fromQuery) {
    const n = Number.parseInt(fromQuery, 10);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  // 2) Try JSON body (used by auto-advance)
  try {
    const body = (await req.json()) as any;
    if (body) {
      raw =
        body.runId ??
        body.run_id ??
        body.id ??
        null;
    }
  } catch {
    // no/invalid JSON – ignore
  }

  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === "string") {
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

// POST: used by /api/orchestrator/auto-advance
export async function POST(req: NextRequest) {
  const runId = await extractRunId(req);

  if (!runId) {
    return NextResponse.json(
      {
        success: false,
        error: "InvalidPayload",
        message: "runId required",
      },
      { status: 400 },
    );
  }

  // 🔧 Stub behaviour:
  // For now we just acknowledge success so that auto-advance
  // can proceed to the finalize phase.
  //
  // Later you can replace this with real Tester integration
  // (calling your test runner / orchestrator-tester bridge).

  return NextResponse.json(
    {
      success: true,
      runId,
      mode: "tester_stub",
      message:
        "Tester stub executed successfully. Replace with real test execution when ready.",
    },
    { status: 200 },
  );
}

// GET: handy for manual checks in browser/PowerShell
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId") ?? url.searchParams.get("run_id");

  return NextResponse.json(
    {
      success: true,
      mode: "tester_stub_get",
      runId,
    },
    { status: 200 },
  );
}
