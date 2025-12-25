export interface PlannerRequest {
  goal: string;                     // User goal or instruction
  context?: string;                 // Optional prior context
  constraints?: PlannerConstraints; // Hard limits
  preferences?: PlannerPreferences; // Soft preferences
  model?: PlannerModelSettings;     // Model override (optional)
}

export interface PlannerConstraints {
  maxSteps?: number;       // Limit number of plan steps
  maxTokens?: number;      // LLM token limit
  strict?: boolean;        // Enforce constraints rigorously
}

export interface PlannerPreferences {
  depth?: "shallow" | "medium" | "deep";  // Output depth
  style?: "technical" | "simple" | "mixed";
  allowParallel?: boolean;                // Enable parallel substeps
}

export interface PlannerModelSettings {
  provider?: "openai" | "anthropic" | "local";
  modelName?: string;       // e.g. gpt-4.1, o1-mini, sonnet
  temperature?: number;
  maxTokens?: number;
}

export interface PlanStep {
  id: string;                 // Unique step ID
  title: string;              // Short name
  description: string;        // Detailed explanation
  type: "action" | "analysis" | "decision" | "subtask";
  dependsOn?: string[];       // Step dependencies
  outputs?: string[];         // Expected outputs
  parallelGroup?: string;     // For parallel execution
}

export interface PlannerMeta {
  createdAt: string;
  modelUsed: string;
  tokens: number;
  latencyMs: number;
}

export interface PlannerResponse {
  goal: string;
  steps: PlanStep[];
  metadata: PlannerMeta;
}
