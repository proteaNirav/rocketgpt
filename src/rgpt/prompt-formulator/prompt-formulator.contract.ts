/**
 * RGPT-S19-P2 — Prompt Formulator Contract
 *
 * This interface defines the ONLY allowed way to construct prompts in RocketGPT.
 * Any provider adapter must consume the output of this contract.
 * Direct prompt string construction outside Prompt Formulator is forbidden.
 */

export interface PromptGovernance {
  correlationId: string;
  runId: string;
  policyVersion: string;
  safetyLevel: "strict" | "standard";
}

export interface PromptConstraints {
  maxTokens?: number;
  temperature?: number;
  allowTools?: boolean;
}

export interface PromptOutputContract {
  type: "json" | "text" | "tool";
  schema?: Record<string, unknown>;
  description?: string;
}

export interface FormulatedPrompt {
  systemIntent: string;
  governance: PromptGovernance;
  task: string;
  constraints: PromptConstraints;
  outputContract: PromptOutputContract;
  metadata?: Record<string, unknown>;
}

/**
 * Prompt Formulator interface
 * Must be pure, deterministic, and ≤100ms.
 */
export interface PromptFormulator {
  formulate(input: {
    intent: string;
    task: string;
    userProfile?: Record<string, unknown>;
  }): FormulatedPrompt;
}
