export type CognitiveStateValue =
  | "initializing"
  | "understanding"
  | "planning"
  | "executing"
  | "evaluating"
  | "completed"
  | "failed";

export interface CognitiveStateTransition {
  from: CognitiveStateValue;
  to: CognitiveStateValue;
  timestamp: string;
  reason?: string;
  source?: string;
}
