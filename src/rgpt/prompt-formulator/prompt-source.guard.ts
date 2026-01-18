import { FormulatedPrompt } from "./prompt-formulator.contract";

/**
 * Enforces that prompts sent to providers originate from Prompt Formulator.
 * This must be called immediately before any outbound AI request.
 */
export function assertPromptFromFormulator(prompt: FormulatedPrompt): void {
  if (!prompt) {
    throw new Error("PromptSourceViolation: prompt is null or undefined");
  }

  if (!prompt.metadata || prompt.metadata.promptSource !== "prompt-formulator") {
    throw new Error(
      "PromptSourceViolation: outbound prompt did not originate from Prompt Formulator"
    );
  }

  if (!prompt.governance?.correlationId || !prompt.governance?.runId) {
    throw new Error(
      "PromptGovernanceViolation: missing correlationId or runId"
    );
  }
}
