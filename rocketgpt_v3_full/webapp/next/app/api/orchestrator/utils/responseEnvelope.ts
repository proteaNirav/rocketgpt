import type { ErrorEnvelope } from "./errorEnvelope";

export type OrchestratorStage =
  | "planner"
  | "builder"
  | "tester"
  | "orchestrator"
  | string;

export interface OrchestratorResponse<T = any> {
  success: boolean;
  run_id: string;
  stage?: OrchestratorStage;
  data?: T;
  error?: ErrorEnvelope | null;
}

/**
 * Helper to build a successful orchestrator response.
 */
export function makeSuccessResponse<T>(
  run_id: string,
  stage: OrchestratorStage,
  data: T
): OrchestratorResponse<T> {
  return {
    success: true,
    run_id,
    stage,
    data,
    error: null,
  };
}

/**
 * Helper to build a failed orchestrator response.
 */
export function makeErrorResponse(
  run_id: string,
  stage: OrchestratorStage,
  error: ErrorEnvelope
): OrchestratorResponse<null> {
  return {
    success: false,
    run_id,
    stage,
    data: null,
    error,
  };
}
