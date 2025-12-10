import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// --------------------------------------------------
// Supabase Admin Client
// --------------------------------------------------
function getSupabaseAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client is not configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// --------------------------------------------------
// POST /api/orchestrator/run/finalize
// --------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const runId: number | undefined = body?.runId;

    if (!runId || typeof runId !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "InvalidPayload",
          message: "runId (number) is required.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1) Mark the run as finalized
    const { error: updateErr } = await supabase
      .from("rgpt_runs")
      .update({ status: "finalized", finalized_at: new Date().toISOString() })
      .eq("id", runId);

    if (updateErr) {
      return NextResponse.json(
        {
          success: false,
          error: "FinalizeError",
          message: updateErr.message,
        },
        { status: 500 }
      );
    }

    // 2) Fetch updated record
    const { data: runRecord, error: fetchErr } = await supabase
      .from("rgpt_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json(
        {
          success: false,
          error: "RecordFetchError",
          message: fetchErr.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        runId,
        run: runRecord,
        message: "Run finalized successfully.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/run/finalize] ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "FinalizeException",
        message: err?.message ?? "Unexpected error while finalizing run.",
      },
      { status: 500 }
    );
  }
}
