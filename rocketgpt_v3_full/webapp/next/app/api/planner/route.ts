import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { callLLM } from "@/lib/llm/router";
import { makePlannerGoal } from "@/lib/orchestrator/goal-factory";
import { resolveRouting } from "@/lib/orchestrator/router";
import { evaluateApproval } from "@/lib/approvals/v9/evaluator";
import type { ApprovalInput, ApprovalPacket } from "@/lib/approvals/v9/types";
export const runtime = "nodejs";


type PlannerStep = {
  step_no: number;
  title: string;
  description: string;
  acceptance_criteria?: string;
};

type PlannerPlan = {
  plan_title: string;
  goal_summary: string;
  steps: PlannerStep[];
};

const PLANNER_SYSTEM_PROMPT = `
You are the RocketGPT Planner.

Your job:
- Take a product or engineering GOAL.
- Produce a clear, practical, step-by-step PLAN.
- Each step must be small, implementable, and testable.
- Audience: senior engineers + tech PMs.

STRICT OUTPUT FORMAT:
Return ONLY valid JSON, no markdown, no commentary.

{
  "plan_title": "Short title for the plan",
  "goal_summary": "1â€“3 sentence summary in plain English.",
  "steps": [
    {
      "step_no": 1,
      "title": "Step title",
      "description": "Clear explanation of what to do in this step.",
      "acceptance_criteria": "How we know this step is complete."
    }
  ]
}
`.trim();

function buildUserPrompt(goalTitle: string, goalDescription: string): string {
  const title = goalTitle || "Untitled goal";
  const desc = goalDescription || "";
  return [
    "You will design a step-by-step implementation plan.",
    "",
    `Goal title: ${title}`,
    "",
    desc ? `Goal description: ${desc}` : "",
    "",
    "Respond ONLY with JSON as per the required schema. Do not wrap in markdown. Do not add explanations.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  try {
    const body = await req.json().catch(() => ({}));

    const goalTitle: string =
      body.goal_title ?? body.goalTitle ?? "Untitled Goal";

    const goalDescription: string =
      body.goal_description ?? body.goalDescription ?? "";

    const plannerModel: string =
      body.planner_model ??
      body.model ??
      process.env.RGPT_PLANNER_MODEL ??
      "gpt-4.1-mini";

    // ---- Neural Orchestrator: goal + routing (read-only) ----
    const runId: string =
      body.run_id ?? body.runId ?? "planner-ad-hoc-run";

    const step: number =
      typeof body.step === "number" && Number.isFinite(body.step)
        ? body.step
        : 1;

    const domain: string | undefined =
      typeof body.domain === "string" && body.domain.trim().length > 0
        ? body.domain
        : undefined;

    const tags: string[] | undefined = Array.isArray(body.tags)
      ? body.tags
          .map((t: unknown) => (typeof t === "string" ? t.trim() : ""))
          .filter((t: string) => t.length > 0)
      : undefined;

    const goal = makePlannerGoal({
      runId,
      step,
      domain,
      tags,
      description: goalDescription || goalTitle,
    });

    const routing = resolveRouting(goal);

    console.log("[Planner Router]", {
      goal,
      routingDecision: routing.decision,
      agent: routing.agent?.id,
      libraries: routing.libraries.map((l) => l.id),
    });
    // ---- end Neural Orchestrator block ----

    const userPrompt = buildUserPrompt(goalTitle, goalDescription);

    const llmResult = await callLLM({
      model: plannerModel,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1800,
    });

    const rawText = (llmResult.output_text || "").trim();

    let parsedPlan: PlannerPlan | null = null;
    try {
      parsedPlan = JSON.parse(rawText) as PlannerPlan;
    } catch (parseErr) {
      console.error("[Planner] Failed to parse LLM JSON:", parseErr);
    }

    // ---- Approvals V9: shadow evaluation, non-blocking ----
    const approvalInput: ApprovalInput = {
      requestId: `${runId}:${step}:planner`,
      runId,
      step,
      category: "planner",
      payload: {
        goal,
        routingDecision: routing.decision,
        routingAgentId: routing.agent?.id ?? null,
        routingLibraryIds: routing.libraries.map((l) => l.id),
        plannerModel,
        goalTitle,
        goalDescription,
        rawText,
        parsedPlan,
      },
    };

    let approvalResult: ApprovalPacket | null = null;
    try {
      approvalResult = await evaluateApproval(approvalInput);

      console.log("[Planner Approvals V9]", {
        risk: approvalResult.risk,
        suggestedAction: approvalResult.suggestedAction,
        requiresHuman: approvalResult.requiresHuman,
        reasons: approvalResult.reasons,
        hints: approvalResult.hints,
      });
    } catch (err) {
      console.error("[Planner Approvals V9] evaluation failed", err);
    }
    // ---- end Approvals V9 block ----

    return NextResponse.json({
      success: true,
      model: llmResult.model,
      goal_title: goalTitle,
      goal_description: goalDescription,
      plan: parsedPlan,
      rawText,
      usage: llmResult.usage ?? null,
      // NOTE: response shape kept backward-compatible;
      // approvals are only logged, not returned.
    });
  } catch (err: any) {
    console.error("[Planner] Error:", err);

    const message =
      err?.message || "Unexpected error while generating plan.";

    const status = (err as any)?.status || 500;

    return NextResponse.json(
      {
        success: false,
        error: "PlannerError",
        message,
      },
      { status }
    );
  }
}
