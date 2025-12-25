import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin not configured.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// GET /api/orchestrator/run/status?runId=123
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runIdStr = searchParams.get("runId");

    if (!runIdStr) {
      return NextResponse.json(
        { success: false, message: "runId query required" },
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

    const supabase = supabaseAdmin();

    const { data, error } = await supabase
      .from("rgpt_runs")
      .select("id,status")
      .eq("id", runId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Run not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        runId,
        status: data.status,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/run/status] ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
