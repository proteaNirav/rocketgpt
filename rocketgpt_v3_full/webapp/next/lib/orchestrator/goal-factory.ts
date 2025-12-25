import type { OrchestratorGoal, OrchestratorStage } from "./router";

/**
 * Base shape for goal factory inputs.
 * APIs can extend this if they want more detail later.
 */
export interface GoalFactoryBaseInput {
  runId?: string;
  step?: number;
  domain?: string;
  tags?: string[];
  description: string;
}

export interface PlannerGoalInput extends GoalFactoryBaseInput {}
export interface BuilderGoalInput extends GoalFactoryBaseInput {}
export interface TesterGoalInput extends GoalFactoryBaseInput {}
export interface ResearchGoalInput extends GoalFactoryBaseInput {}

function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags) return undefined;
  const cleaned = tags
    .map((t) => (t ?? "").trim())
    .filter((t) => t.length > 0);
  return cleaned.length ? cleaned : undefined;
}

function normalizeDomain(domain?: string): string | undefined {
  if (!domain) return undefined;
  const trimmed = domain.trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Generic helper: build an OrchestratorGoal for a given stage.
 */
function makeGoal(
  stage: OrchestratorStage,
  input: GoalFactoryBaseInput
): OrchestratorGoal {
  return {
    stage,
    runId: input.runId,
    step: input.step,
    domain: normalizeDomain(input.domain),
    tags: normalizeTags(input.tags),
    description: input.description,
  };
}

/**
 * Goal factory for Planner stage.
 */
export function makePlannerGoal(input: PlannerGoalInput): OrchestratorGoal {
  return makeGoal("planner", input);
}

/**
 * Goal factory for Builder stage.
 */
export function makeBuilderGoal(input: BuilderGoalInput): OrchestratorGoal {
  return makeGoal("builder", input);
}

/**
 * Goal factory for Tester stage.
 */
export function makeTesterGoal(input: TesterGoalInput): OrchestratorGoal {
  return makeGoal("tester", input);
}

/**
 * Goal factory for Research stage.
 */
export function makeResearchGoal(input: ResearchGoalInput): OrchestratorGoal {
  return makeGoal("research", input);
}
