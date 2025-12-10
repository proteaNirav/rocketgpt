import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client is not configured. " +
        "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or equivalent).",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Map DB status (e.g. "builder_running", "planner_completed") to a simple timeline status
function deriveStatus(raw?: string | null) {
  if (!raw) return "unknown";

  const s = raw.toLowerCase();

  if (s === "pending") return "pending";
  if (s.startsWith("planner")) return "planner";
  if (s.startsWith("builder")) return "builder";
  if (s.startsWith("tester")) return "tester";
  if (s.startsWith("completed") || s.startsWith("final")) return "completed";

  return "unknown";
}

// GET /api/orchestrator/run/status?runId=21
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runIdStr = searchParams.get("runId");

    if (!runIdStr) {
      return NextResponse.json(
        { success: false, message: "runId is required" },
        { status: 400 },
      );
    }

    const runId = Number(runIdStr);
    if (!Number.isFinite(runId)) {
      return NextResponse.json(
        { success: false, message: "runId must be a number" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: run, error } = await supabase
      .from("rgpt_runs")
      .select("*")
      .eq("id", runId)
      .single();

    if (error || !run) {
      return NextResponse.json(
        { success: false, message: "Run not found" },
        { status: 404 },
      );
    }

    const rawStatus: string | null = run.status ?? null;
    const derivedStatus = deriveStatus(rawStatus ?? undefined);

    return NextResponse.json(
      {
        success: true,
        runId,
        status: rawStatus,
        derivedStatus,
        run,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/run/status] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? "Status endpoint error",
      },
      { status: 500 },
    );
  }
}
