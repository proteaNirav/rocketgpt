//
// RocketGPT - Builder Expansion Logic
// ------------------------------------
// Responsible for:
//   - Expanding a PlannerPlan into BuilderStepDefinition[]
//   - Persisting builder steps into rgpt_builder_steps
//

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlannerPlan, PlannerStep, BuilderStepDefinition } from "./builder_state";

// -----------------------------------------------
// Pure expansion: PlannerPlan -> BuilderStepDefinition[]
// -----------------------------------------------

/**
 * Expand a PlannerPlan into BuilderStepDefinitions for a given run.
 *
 * Current strategy:
 *   - One BuilderStep per PlannerStep (1:1 mapping)
 *   - Instruction text is LLM-ready with full context
 *   - Can be extended later to multiple builder steps per planner step
 */
export function expandPlannerPlanToBuilderSteps(
  runId: number,
  plan: PlannerPlan
): BuilderStepDefinition[] {
  const builderSteps: BuilderStepDefinition[] = [];

  for (const step of plan.steps) {
    const builderStepNo = 1; // reserved for future multi-step expansion

    const instruction = buildInstructionForPlannerStep(runId, plan, step);

    builderSteps.push({
      run_id: runId,
      planner_step_no: step.step_no,
      builder_step_no: builderStepNo,
      title: step.title,
      instruction
    });
  }

  return builderSteps;
}

/**
 * Build the LLM-ready instruction text for a single planner step.
 */
function buildInstructionForPlannerStep(
  runId: number,
  plan: PlannerPlan,
  step: PlannerStep
): string {
  const dependsOnText =
    step.depends_on && step.depends_on.length > 0
      ? `This step depends on successful completion of planner steps: ${step.depends_on.join(", ")}.`
      : "This step has no explicit dependencies, but you should still respect the overall plan order.";

  const acceptanceText = step.acceptance_criteria
    ? step.acceptance_criteria
    : "Follow best engineering practices and keep changes minimal, coherent, and testable.";

  return [
    "You are the Builder agent for RocketGPT.",
    "",
    `Orchestrator Run ID: ${runId}`,
    `Overall Goal: ${plan.goal_summary}`,
    "",
    `Current Planner Step (${step.step_no}): ${step.title}`,
    "",
    "Step Description:",
    step.description,
    "",
    "Dependencies:",
    dependsOnText,
    "",
    "Acceptance Criteria:",
    acceptanceText,
    "",
    "Output Requirements:",
    "- Plan the exact file(s) to edit or create in the RocketGPT repo.",
    "- Describe the change in clear, structured steps.",
    "- Where possible, produce concrete code snippets or full replacements.",
    "- Avoid making breaking changes to unrelated modules.",
    "- Keep the output deterministic and easy to apply programmatically."
  ].join("\n");
}

// -----------------------------------------------
// Persistence: Save Builder Steps to DB
// -----------------------------------------------

type RgptBuilderStepInsert = {
  run_id: number;
  planner_step_no: number;
  builder_step_no: number;
  title: string;
  instruction: string;
  status?: "pending" | "running" | "success" | "failed";
};

/**
 * Persist builder steps into rgpt_builder_steps using a Supabase client.
 *
 * - Sets initial status = 'pending'
 * - Returns the inserted rows from DB
 * - Throws Error on failure (to be handled by orchestrator API)
 */
export async function saveBuilderSteps(
  supabase: SupabaseClient,
  steps: BuilderStepDefinition[]
) {
  if (!steps.length) {
    return [];
  }

  const payload: RgptBuilderStepInsert[] = steps.map((s) => ({
    run_id: s.run_id,
    planner_step_no: s.planner_step_no,
    builder_step_no: s.builder_step_no,
    title: s.title,
    instruction: s.instruction,
    status: "pending"
  }));

  const { data, error } = await supabase
    .from("rgpt_builder_steps")
    .insert(payload)
    .select();

  if (error) {
    throw new Error(`Failed to insert builder steps: ${error.message}`);
  }

  return data;
}

/**
 * Convenience helper:
 *   - Expand a PlannerPlan into builder steps
 *   - Persist them
 *   - Return the DB rows
 */
export async function createBuilderStepsForRun(
  supabase: SupabaseClient,
  runId: number,
  plan: PlannerPlan
) {
  const steps = expandPlannerPlanToBuilderSteps(runId, plan);
  return await saveBuilderSteps(supabase, steps);
}
