import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { PlannerPlan } from "@/lib/orchestrator/builder_state";

export const dynamic = "force-dynamic";

// -------------------------------------------------
// Supabase admin client
// -------------------------------------------------
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
    auth: { persistSession: false }
  });
}

// -------------------------------------------------
// OpenAI client
// -------------------------------------------------
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Planner requires an OpenAI API key."
    );
  }
  return new OpenAI({ apiKey });
}

// -------------------------------------------------
// Strip ```json fences from LLM output, if present
// -------------------------------------------------
function stripCodeFences(raw: string): string {
  let txt = raw.trim();

  if (txt.startsWith("```")) {
    const firstNewline = txt.indexOf("\n");
    if (firstNewline !== -1) {
      const firstLine = txt.slice(0, firstNewline).trim();
      let rest = txt.slice(firstNewline + 1);

      if (/^```(json)?/i.test(firstLine)) {
        txt = rest.trim();
      }
    }
  }

  if (txt.endsWith("```")) {
    const lastFence = txt.lastIndexOf("```");
    if (lastFence !== -1) {
      txt = txt.slice(0, lastFence).trim();
    }
  }

  return txt.trim();
}

// -------------------------------------------------
// Call OpenAI to generate a PlannerPlan
// -------------------------------------------------
async function callPlanner(
  openai: OpenAI,
  plannerModel: string,
  goalTitle: string,
  goalDescription?: string,
  contextNotes?: string
): Promise<{ plan: PlannerPlan; rawText: string; durationMs: number }> {
  const started = Date.now();

  const userTextLines: string[] = [`Goal: ${goalTitle}`];
  if (goalDescription) {
    userTextLines.push("", `Description: ${goalDescription}`);
  }
  if (contextNotes) {
    userTextLines.push("", `Context / Constraints: ${contextNotes}`);
  }

  const messages = [
    {
      role: "system",
      content:
        "You are the Planner agent for RocketGPT. " +
        "You create a concise implementation plan for software changes. " +
        "You MUST respond with STRICT JSON only, no prose. " +
        "The JSON must match this TypeScript type exactly: " +
        "{ plan_title: string; goal_summary: string; steps: { step_no: number; title: string; description: string; acceptance_criteria?: string; depends_on?: number[]; }[] }."
    },
    {
      role: "user",
      content: userTextLines.join("\n")
    }
  ] as const;

  const completion = await openai.chat.completions.create({
    model: plannerModel,
    messages: messages as any,
    temperature: 0.2
  });

  const rawText =
    completion.choices?.[0]?.message?.content?.trim() ?? "";

  const jsonText = stripCodeFences(rawText);

  let parsed: PlannerPlan;

  try {
    parsed = JSON.parse(jsonText) as PlannerPlan;
  } catch (err: any) {
    throw new Error(
      "Planner LLM returned invalid JSON: " + (err?.message ?? "parse error")
    );
  }

  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Planner returned a plan without any steps.");
  }

  const durationMs = Date.now() - started;
  return { plan: parsed, rawText, durationMs };
}

// -------------------------------------------------
// POST /api/orchestrator/run/planner
// -------------------------------------------------
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const runId = Number(body?.runId);

    if (!runId || !Number.isFinite(runId)) {
      return NextResponse.json(
        { success: false, message: "runId must be a valid number" },
        { status: 400 }
      );
    }

    const { data: run, error } = await supabase
      .from("rgpt_runs")
      .select("id, goal_title, goal_description, planner_model")
      .eq("id", runId)
      .single();

    if (error || !run) {
      return NextResponse.json(
        { success: false, message: "Run not found" },
        { status: 404 }
      );
    }

    const openai = getOpenAIClient();
    const plannerModel =
      (run as any).planner_model ??
      process.env.RGPT_PLANNER_MODEL ??
      "gpt-4.1-mini";

    const goalTitle = (run as any).goal_title ?? `Run ${runId}`;
    const goalDescription = (run as any).goal_description ?? "";

    const { plan, rawText, durationMs } = await callPlanner(
      openai,
      plannerModel,
      goalTitle,
      goalDescription
    );

    const { error: updErr } = await supabase
      .from("rgpt_runs")
      .update({
        planner_plan: plan as any,
        planner_duration_ms: durationMs,
        status: "planner_completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", runId);

    if (updErr) {
      return NextResponse.json(
        { success: false, message: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        runId,
        plan,
        rawText,
        model: plannerModel,
        durationMs
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/run/planner] ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message ?? "Planner error"
      },
      { status: 500 }
    );
  }
}
