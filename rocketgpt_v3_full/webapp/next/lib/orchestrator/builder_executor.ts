//
// RocketGPT - Builder Execution Engine (DB helpers)
// --------------------------------------------------
// Responsibilities:
//   - Fetch next pending builder step for a run
//   - Mark step as running / success / failed
//   - Track llm_input, llm_output, and error_message
//

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BuilderStepStatus } from "./builder_state";

// Shape of a builder step row as returned from Supabase
export interface BuilderStepRow {
  id: number;
  run_id: number;
  planner_step_no: number;
  builder_step_no: number;
  title: string;
  instruction: string;
  llm_input: string | null;
  llm_output: string | null;
  status: BuilderStepStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------
// Fetch next pending step for a given run
// -----------------------------------------------

export async function getNextPendingBuilderStep(
  supabase: SupabaseClient,
  runId: number
): Promise<BuilderStepRow | null> {
  const { data, error } = await supabase
    .from("rgpt_builder_steps")
    .select("*")
    .eq("run_id", runId)
    .eq("status", "pending")
    .order("planner_step_no", { ascending: true })
    .order("builder_step_no", { ascending: true })
    .order("id", { ascending: true })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch next pending builder step: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Supabase returns snake_case columns; they already match the interface
  return data[0] as BuilderStepRow;
}

// -----------------------------------------------
// State transitions
// -----------------------------------------------

async function updateBuilderStepStatus(
  supabase: SupabaseClient,
  stepId: number,
  patch: Partial<{
    status: BuilderStepStatus;
    llm_input: string | null;
    llm_output: string | null;
    error_message: string | null;
  }>
): Promise<BuilderStepRow> {
  const { data, error } = await supabase
    .from("rgpt_builder_steps")
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq("id", stepId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update builder step ${stepId}: ${error.message}`);
  }

  return data as BuilderStepRow;
}

/**
 * Mark a builder step as "running".
 */
export async function markBuilderStepRunning(
  supabase: SupabaseClient,
  stepId: number
): Promise<BuilderStepRow> {
  return updateBuilderStepStatus(supabase, stepId, { status: "running" });
}

/**
 * Mark a builder step as "success" and store llm_input/llm_output.
 */
export async function markBuilderStepSuccess(
  supabase: SupabaseClient,
  stepId: number,
  llmInput: string,
  llmOutput: string
): Promise<BuilderStepRow> {
  return updateBuilderStepStatus(supabase, stepId, {
    status: "success",
    llm_input: llmInput,
    llm_output: llmOutput,
    error_message: null
  });
}

/**
 * Mark a builder step as "failed" and store error_message (and optional llm_input/output).
 */
export async function markBuilderStepFailed(
  supabase: SupabaseClient,
  stepId: number,
  errorMessage: string,
  llmInput?: string,
  llmOutput?: string
): Promise<BuilderStepRow> {
  return updateBuilderStepStatus(supabase, stepId, {
    status: "failed",
    error_message: errorMessage,
    llm_input: llmInput ?? null,
    llm_output: llmOutput ?? null
  });
}
