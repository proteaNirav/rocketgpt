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
        "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

async function callPhaseEndpoint(
  origin: string,
  path: string,
  body: unknown,
): Promise<any> {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { rawText: text };
  }

  if (!res.ok) {
    throw new Error(
      `Phase endpoint ${path} failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return json;
}

async function updateStatus(
  supabase: SupabaseClient,
  runId: number,
  status: string,
) {
  const { error } = await supabase
    .from("rgpt_runs")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`Failed to update status to '${status}': ${error.message}`);
  }
}

// POST /api/orchestrator/auto-advance
// Body: { runId: number }
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const runId = Number(body?.runId);

    if (!runId || !Number.isFinite(runId)) {
      return NextResponse.json(
        { success: false, message: "runId must be a valid number" },
        { status: 400 },
      );
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    // Fetch current run to determine status
    const { data: run, error } = await supabase
      .from("rgpt_runs")
      .select("id, status")
      .eq("id", runId)
      .single();

    if (error || !run) {
      return NextResponse.json(
        { success: false, message: "Run not found" },
        { status: 404 },
      );
    }

    const currentStatus: string = (run as any).status ?? "pending";
    let phase: "planner" | "builder" | "tester" | "finalize" | "noop";
    let phaseResult: any = null;

    // Decide next phase based on current status
    if (currentStatus === "completed") {
      phase = "noop";
      return NextResponse.json(
        {
          success: true,
          runId,
          phase,
          phaseResult: null,
        },
        { status: 200 },
      );
    } else if (currentStatus === "pending") {
      // Run planner
      phase = "planner";
      phaseResult = await callPhaseEndpoint(
        origin,
        "/api/orchestrator/run/planner",
        { runId },
      );

      if (!phaseResult?.success) {
        return NextResponse.json(
          {
            success: false,
            runId,
            phase,
            phaseResult,
          },
          { status: 500 },
        );
      }

      await updateStatus(supabase, runId, "planner_completed");
    } else if (
      currentStatus === "planner_completed" ||
      currentStatus === "builder_running"
    ) {
      // Run one builder step
      phase = "builder";
      phaseResult = await callPhaseEndpoint(
        origin,
        "/api/orchestrator/run/builder",
        { runId },
      );

      if (!phaseResult?.success) {
        await updateStatus(supabase, runId, "builder_running");
        return NextResponse.json(
          {
            success: false,
            runId,
            phase,
            phaseResult,
          },
          { status: 500 },
        );
      }

      const remaining =
        typeof phaseResult?.remaining === "number"
          ? (phaseResult.remaining as number)
          : null;

      if (remaining !== null && remaining > 0) {
        await updateStatus(supabase, runId, "builder_running");
      } else {
        await updateStatus(supabase, runId, "builder_completed");
      }
    } else if (
      currentStatus === "builder_completed" ||
      currentStatus === "tester_running"
    ) {
      // Run tester
      phase = "tester";
      phaseResult = await callPhaseEndpoint(
        origin,
        "/api/orchestrator/run/tester",
        { runId },
      );

      if (!phaseResult?.success) {
        await updateStatus(supabase, runId, "tester_running");
        return NextResponse.json(
          {
            success: false,
            runId,
            phase,
            phaseResult,
          },
          { status: 500 },
        );
      }

      await updateStatus(supabase, runId, "tester_completed");
    } else if (currentStatus === "tester_completed") {
      // Finalize
      phase = "finalize";
      phaseResult = await callPhaseEndpoint(
        origin,
        "/api/orchestrator/run/finalize",
        { runId },
      );

      if (phaseResult?.success === false) {
        return NextResponse.json(
          {
            success: false,
            runId,
            phase,
            phaseResult,
          },
          { status: 500 },
        );
      }

      await updateStatus(supabase, runId, "completed");
    } else {
      // Unknown status -> treat as noop, but return current status for debugging
      phase = "noop";
      phaseResult = { message: `Unknown status: ${currentStatus}` };
      return NextResponse.json(
        {
          success: true,
          runId,
          phase,
          phaseResult,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        runId,
        phase,
        phaseResult,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/auto-advance] ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? "auto-advance error",
      },
      { status: 500 },
    );
  }
}
