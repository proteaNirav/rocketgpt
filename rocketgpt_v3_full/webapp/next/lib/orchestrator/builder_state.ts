//
// RocketGPT - Orchestrator/Builder State & Types
// -----------------------------------------------
// Central definition of:
//   - Orchestrator run status values
//   - Builder step status values
//   - Planner plan / step types
//   - Builder step definition type
//

// -----------------------------------------------
// Orchestrator Run Status
// -----------------------------------------------

export const ORCH_RUN_STATUSES = [
  "created",
  "planning",
  "building",
  "testing",
  "completed",
  "failed"
] as const;

export type OrchestratorRunStatus = (typeof ORCH_RUN_STATUSES)[number];

// -----------------------------------------------
// Builder Step Status
// -----------------------------------------------

export const BUILDER_STEP_STATUSES = [
  "pending",
  "running",
  "success",
  "failed"
] as const;

export type BuilderStepStatus = (typeof BUILDER_STEP_STATUSES)[number];

// -----------------------------------------------
// Planner Plan Types (LLM output from Planner)
// -----------------------------------------------

export interface PlannerStep {
  step_no: number;              // 1-based step sequence from planner
  title: string;                // Short title, e.g. "Create settings toggle"
  description: string;          // Detailed explanation of what to do
  acceptance_criteria?: string; // Optional - what "done" means
  depends_on?: number[];        // Optional dependency on other step numbers
}

export interface PlannerPlan {
  plan_title: string;           // e.g. "Add Dark Mode to Settings UI"
  goal_summary: string;         // Short summary of overall goal
  steps: PlannerStep[];         // Ordered planner steps
}

// -----------------------------------------------
// Builder Step Definition (what we store/run)
// -----------------------------------------------

export interface BuilderStepDefinition {
  run_id: number;               // FK to orchestrator run (DB: rgpt_builder_steps.run_id)
  planner_step_no: number;      // Planner step that this builder step belongs to
  builder_step_no: number;      // 1-based sequence within planner step
  title: string;                // Builder step title
  instruction: string;          // Final instruction text sent to Builder LLM
}

// -----------------------------------------------
// JSON Contract Notes
// -----------------------------------------------
//
// Planner LLM is expected to return JSON like:
//
// {
//   "plan_title": "Add Dark Mode to Settings UI",
//   "goal_summary": "Implement a dark mode feature for RocketGPT settings page.",
//   "steps": [
//     {
//       "step_no": 1,
//       "title": "Analyze existing settings UI",
//       "description": "Review current settings page components, theme handling, and layout.",
//       "acceptance_criteria": "We have a clear list of components and current theming behavior.",
//       "depends_on": []
//     },
//     {
//       "step_no": 2,
//       "title": "Extend theme provider for dark mode",
//       "description": "Add dark mode support to the global theme provider...",
//       "acceptance_criteria": "Toggling theme changes root CSS variables for dark/light.",
//       "depends_on": [1]
//     }
//   ]
// }
//
// Builder will then expand each PlannerStep into one or more BuilderStepDefinition
// and persist them to table: rgpt_builder_steps.
//
