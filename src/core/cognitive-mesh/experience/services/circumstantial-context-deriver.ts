import type {
  CircumstantialContext,
  ExperienceCircumstantialSignalInput,
} from "../types/experience.types";

export function deriveCircumstantialContext(input: ExperienceCircumstantialSignalInput): CircumstantialContext {
  const confidence = Number.isFinite(input.confidence) ? (input.confidence as number) : 1;
  return {
    fallbackTriggered: input.fallbackTriggered ?? false,
    guardrailApplied: input.guardrailApplied ?? false,
    verificationRequired: input.verificationRequired ?? false,
    verificationFailed: input.verificationVerdict != null && input.verificationVerdict !== "accept",
    multipleCapabilitiesUsed: (input.capabilitiesUsed?.length ?? 0) > 1,
    highComplexityRequest: (input.requestComplexityScore ?? 0) >= 0.75,
    stateFragility: input.stateFragility ?? false,
    recoveryPathUsed: input.recoveryPathUsed ?? false,
    lowConfidenceResult: confidence < 0.6,
  };
}
