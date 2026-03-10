import type {
  CircumstantialContext,
  ExperienceOutcome,
  LearnableValueAssessment,
} from "../types/experience.types";

export function assessLearnableValue(
  outcome: ExperienceOutcome,
  circumstances: CircumstantialContext
): LearnableValueAssessment {
  const rationale: string[] = [];
  let score = 0;

  if (outcome.classification === "failed" || outcome.classification === "guarded" || outcome.classification === "rejected") {
    score += 4;
    rationale.push("non_success_outcome");
  }
  if (circumstances.verificationRequired) {
    score += 2;
    rationale.push("verification_signal_present");
  }
  if (circumstances.fallbackTriggered || circumstances.recoveryPathUsed) {
    score += 2;
    rationale.push("recovery_path_signal_present");
  }
  if (circumstances.highComplexityRequest || circumstances.stateFragility) {
    score += 1;
    rationale.push("complex_or_fragile_context");
  }

  if (score >= 6) {
    return { level: "high", rationale, reusableValue: true };
  }
  if (score >= 3) {
    return { level: "medium", rationale, reusableValue: true };
  }
  if (score >= 1) {
    return { level: "low", rationale, reusableValue: false };
  }
  return { level: "none", rationale: ["minimal_learning_signal"], reusableValue: false };
}

