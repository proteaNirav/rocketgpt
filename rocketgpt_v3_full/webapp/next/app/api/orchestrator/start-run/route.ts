import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin client missing config.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false }
  });
}

// ===============================================
// POST /api/orchestrator/start-run
// Creates run with status=pending
// ===============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal_title, goal_description, planner_model, builder_model } = body;

    if (!goal_title || typeof goal_title !== "string") {
      return NextResponse.json(
        { error: "InvalidPayload", message: "goal_title is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("rgpt_runs")
      .insert({
        goal_title,
        goal_description,
        planner_model: planner_model ?? "gpt-4.1-mini",
        builder_model: builder_model ?? "gpt-4.1-mini",
        status: "pending"
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, runId: data.id }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "StartRunError", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
