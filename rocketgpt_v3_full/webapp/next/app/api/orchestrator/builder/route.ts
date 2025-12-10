import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createBuilderStepsForRun } from "@/lib/orchestrator/builder_expander";
import type { PlannerPlan } from "@/lib/orchestrator/builder_state";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runId, plan } = body as { runId: number; plan: PlannerPlan };

    if (typeof runId !== "number" || !Number.isFinite(runId)) {
      return NextResponse.json(
        {
          error: "InvalidPayload",
          message: "runId must be a finite number."
        },
        { status: 400 }
      );
    }

    if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      return NextResponse.json(
        {
          error: "InvalidPayload",
          message:
            "plan must be a valid PlannerPlan object with at least one step."
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    const inserted = await createBuilderStepsForRun(supabase, runId, plan);

    return NextResponse.json(
      {
        success: true,
        runId,
        builderStepsCount: inserted.length,
        builderSteps: inserted
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/builder] ERROR:", err);

    return NextResponse.json(
      {
        error: "BuilderExpansionError",
        message: err?.message ?? "Unknown error while creating builder steps.",
        stack:
          process.env.NODE_ENV !== "production"
            ? err?.stack ?? null
            : undefined
      },
      { status: 500 }
    );
  }
}
