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
      "Supabase admin client not configured. Please set SUPABASE_URL and service key."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

type PlannerStep = {
  step_no: number;
  title: string;
  description?: string;
  acceptance_criteria?: string;
  depends_on?: number[];
};

type PlannerPlan = {
  plan_title: string;
  goal_summary: string;
  steps: PlannerStep[];
};

function extractPlannerPlan(raw: any): PlannerPlan {
  if (!raw) {
    throw new Error("planner_plan is null; run planner stage first.");
  }

  // Case 1: planner_plan is already the plan object
  if (Array.isArray(raw.steps)) {
    return raw as PlannerPlan;
  }

  // Case 2: planner_plan is of shape { plan: { ... } }
  if (raw.plan && Array.isArray(raw.plan.steps)) {
    return raw.plan as PlannerPlan;
  }

  throw new Error(
    "planner_plan JSON has unexpected shape (no steps array found)."
  );
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json().catch(() => ({}));
    const runId = body.runId ?? body.id ?? body.run_id;

    if (!runId) {
      return NextResponse.json(
        { success: false, message: "runId is required" },
        { status: 400 }
      );
    }

    // 1) Load run with planner_plan
    const { data: run, error: runErr } = await supabase
      .from("rgpt_runs")
      .select("id, status, builder_model, planner_plan, builder_duration_ms")
      .eq("id", runId)
      .single();

    if (runErr || !run) {
      return NextResponse.json(
        { success: false, message: "Run not found" },
        { status: 404 }
      );
    }

    let plannerPlan: PlannerPlan;
    try {
      // Accept both shapes in DB: direct plan or { plan: { ... } }
      plannerPlan = extractPlannerPlan((run as any).planner_plan);
    } catch (e: any) {
      return NextResponse.json(
        {
          success: false,
          runId,
          message: e?.message ?? "planner_plan missing or invalid",
        },
        { status: 500 }
      );
    }

    // 2) Ensure rgpt_builder_steps exists for all planner steps
    let { data: builderSteps, error: stepsErr } = await supabase
      .from("rgpt_builder_steps")
      .select("id, step_no, status")
      .eq("run_id", runId)
      .order("step_no");

    if (stepsErr) {
      return NextResponse.json(
        {
          success: false,
          runId,
          message: `Error loading builder steps: ${stepsErr.message}`,
        },
        { status: 500 }
      );
    }

    if (!builderSteps || builderSteps.length === 0) {
      const rows = plannerPlan.steps.map((s) => ({
        run_id: runId,
        step_no: s.step_no,
        title: s.title,
        description: s.description ?? "",
        acceptance_criteria: s.acceptance_criteria ?? "",
        status: "pending",
      }));

      const { error: insertErr } = await supabase
        .from("rgpt_builder_steps")
        .insert(rows);

      if (insertErr) {
        return NextResponse.json(
          {
            success: false,
            runId,
            message: `Error inserting builder steps: ${insertErr.message}`,
          },
          { status: 500 }
        );
      }

      const fresh = await supabase
        .from("rgpt_builder_steps")
        .select("id, step_no, status")
        .eq("run_id", runId)
        .order("step_no");

      builderSteps = fresh.data ?? [];
    }

    // 3) Find next pending/running step
    const nextStep = (builderSteps ?? []).find(
      (s: any) => s.status === "pending" || s.status === "running"
    );

    // No more steps: mark builder_completed and return remaining=0
    if (!nextStep) {
      await supabase
        .from("rgpt_runs")
        .update({
          status: "builder_completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);

      return NextResponse.json(
        {
          success: true,
          runId,
          executed: [],
          remaining: 0,
        },
        { status: 200 }
      );
    }

    // 4) Execute step (stub): mark as success immediately
    const nowIso = new Date().toISOString();

    const { error: updStepErr } = await supabase
      .from("rgpt_builder_steps")
      .update({
        status: "success",
        updated_at: nowIso,
      })
      .eq("id", nextStep.id);

    if (updStepErr) {
      return NextResponse.json(
        {
          success: false,
          runId,
          message: `Error updating builder step: ${updStepErr.message}`,
        },
        { status: 500 }
      );
    }

    const { data: finalSteps, error: finalErr } = await supabase
      .from("rgpt_builder_steps")
      .select("id, step_no, status")
      .eq("run_id", runId)
      .order("step_no");

    if (finalErr) {
      return NextResponse.json(
        {
          success: false,
          runId,
          message: `Error reloading builder steps: ${finalErr.message}`,
        },
        { status: 500 }
      );
    }

    const remaining = (finalSteps ?? []).filter(
      (s: any) => s.status === "pending" || s.status === "running"
    ).length;

    const newStatus =
      remaining === 0 ? "builder_completed" : "builder_running";

    await supabase
      .from("rgpt_runs")
      .update({
        status: newStatus,
        builder_duration_ms: (run as any).builder_duration_ms ?? null,
        updated_at: nowIso,
      })
      .eq("id", runId);

    return NextResponse.json(
      {
        success: true,
        runId,
        executed: [
          {
            stepId: nextStep.id,
            stepNo: nextStep.step_no,
            status: "success",
          },
        ],
        remaining,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/run/builder] ERROR", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? "Builder route error",
      },
      { status: 500 }
    );
  }
}
