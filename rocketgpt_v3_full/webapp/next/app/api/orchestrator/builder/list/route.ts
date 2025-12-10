import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client is not configured. " +
        "Ensure SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL " +
        "and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY (or anon key in dev) are set."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false
    }
  });
}

// -----------------------------------------------
// GET /api/orchestrator/builder/list?runId=123
// -----------------------------------------------
//
// Returns all builder steps for the given runId.
//
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const runIdParam = searchParams.get("runId");

    if (!runIdParam) {
      return NextResponse.json(
        {
          error: "InvalidQuery",
          message: "Query parameter 'runId' is required."
        },
        { status: 400 }
      );
    }

    const runId = Number(runIdParam);
    if (!Number.isFinite(runId)) {
      return NextResponse.json(
        {
          error: "InvalidQuery",
          message: "Query parameter 'runId' must be a valid number."
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("rgpt_builder_steps")
      .select("*")
      .eq("run_id", runId)
      .order("planner_step_no", { ascending: true })
      .order("builder_step_no", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        success: true,
        runId,
        count: data?.length ?? 0,
        steps: data ?? []
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/builder/list] ERROR:", err);

    return NextResponse.json(
      {
        error: "BuilderListError",
        message: err?.message ?? "Unknown error listing builder steps.",
        stack:
          process.env.NODE_ENV !== "production"
            ? err?.stack ?? null
            : undefined
      },
      { status: 500 }
    );
  }
}
