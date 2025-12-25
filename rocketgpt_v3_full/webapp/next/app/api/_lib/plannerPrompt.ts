/**
 * RocketGPT Planner Prompt
 * Runtime: OpenAI only
 * This file defines the SYSTEM prompt and a helper to build the USER prompt
 * for the Planner agent.
 */

export const PLANNER_SYSTEM_PROMPT = `
You are the PLANNER agent inside the RocketGPT system.

Your responsibility:
Convert a user GOAL and CONTEXT into a precise, multi-step PLAN that other agents can execute (Builder, Tester, Recommender, Self-Improve, Human).

Your output must be a JSON object that strictly follows the required schema. Do NOT include explanations, markdown, or text outside the JSON.

CORE PLANNING RULES
1. Break work into small, specific, verifiable steps.
2. Each step must contain:
   - id (S1, S2, ...)
   - title
   - description
   - type (analysis | design | code | test | docs | infra | prompt | data | review | decision | verification | other)
   - agent_hint (planner | builder | tester | recommender | self-improve | human)
   - inputs_required (list of strings)
   - expected_outputs (list of strings)
   - dependencies (list of step IDs as strings)
   - risk_level (low | medium | high)
   - notes (optional string)
   - tool_selector (optional list of strings)
   - complexity (optional string: "S" | "M" | "L")
3. Dependencies must reference valid step IDs.
4. If essential information is missing, the first step must be a clarification or information-gathering step.
5. Do not combine multiple unrelated actions into a single step.
6. Respect all constraints provided in the CONTEXT.
7. The plan should be logically coherent, ordered, and executable.

MANDATORY OUTPUT FIELDS
- plan_title: string
- goal_summary: string
- assumptions: string[]
- constraints_understood: string[]
- steps: Step[]
- risks: string[]
- next_actions_recommended: string[]

FORMAT RESTRICTIONS
- Output ONLY JSON (no prose, no markdown).
- Maintain correct field names and structure.
- If unsure, produce a safe minimal plan beginning with a clarification step.
`;

export interface PlannerContext {
  project?: string;
  environment?: string;
  repo_summary?: string;
  constraints?: string[];
  preferences?: string[];
}

export interface PlannerInput {
  goal: string;
  context?: PlannerContext;
  history?: string[];
}

/**
 * Build the USER prompt string given the PlannerInput.
 * This is combined with PLANNER_SYSTEM_PROMPT at runtime.
 */
export function buildPlannerUserPrompt(input: PlannerInput): string {
  const lines: string[] = [];

  const goal = input.goal?.trim() || "(no goal provided)";
  const ctx = input.context ?? {};
  const history = input.history ?? [];

  const project = ctx.project ?? "";
  const environment = ctx.environment ?? "";
  const repoSummary = ctx.repo_summary ?? "";
  const constraints = ctx.constraints ?? [];
  const preferences = ctx.preferences ?? [];

  lines.push("GOAL:");
  lines.push(goal);
  lines.push("");

  lines.push("CONTEXT:");
  lines.push(`Project: ${project || "(none)"}`);
  lines.push(`Environment: ${environment || "(none)"}`);
  lines.push(`Repo Summary: ${repoSummary || "(none)"}`);
  lines.push("");

  if (constraints.length > 0) {
    lines.push("Constraints:");
    for (const c of constraints) {
      lines.push(`- ${c}`);
    }
    lines.push("");
  } else {
    lines.push("Constraints:");
    lines.push("- (none specified)");
    lines.push("");
  }

  if (preferences.length > 0) {
    lines.push("Preferences:");
    for (const p of preferences) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  } else {
    lines.push("Preferences:");
    lines.push("- (none specified)");
    lines.push("");
  }

  if (history.length > 0) {
    lines.push("HISTORY:");
    for (const h of history) {
      lines.push(`- ${h}`);
    }
    lines.push("");
  } else {
    lines.push("HISTORY:");
    lines.push("- (no prior history)");
    lines.push("");
  }

  lines.push(
    "Using the GOAL + CONTEXT + HISTORY, produce a PLAN that strictly follows the schema defined in the SYSTEM prompt."
  );
  lines.push("Return ONLY valid JSON.");

  return lines.join("\n");
}
