import type { ExperienceRecord } from "../types/experience.types";

export interface CapturePolicyDecision {
  shouldCapture: boolean;
  relevanceScore: number;
  reasons: string[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class ExperienceCapturePolicy {
  shouldCaptureExperience(record: ExperienceRecord): CapturePolicyDecision {
    const reasons: string[] = [];
    let score = 0;

    const classification = record.outcome.classification;
    if (classification === "failed" || classification === "guarded" || classification === "rejected") {
      score += 0.7;
      reasons.push("high_risk_outcome");
    }
    if (classification === "successful-with-fallback" || classification === "successful-with-verification") {
      score += 0.45;
      reasons.push("non_trivial_success");
    }
    if (record.circumstances.verificationRequired || record.circumstances.fallbackTriggered) {
      score += 0.25;
      reasons.push("governance_or_recovery_signal");
    }
    if (record.learnableValue.reusableValue) {
      score += 0.2;
      reasons.push("reusable_signal");
    }
    if (record.circumstances.highComplexityRequest || record.circumstances.lowConfidenceResult) {
      score += 0.15;
      reasons.push("complexity_or_confidence_signal");
    }
    if (record.governanceIssues.length > 0) {
      score += Math.min(0.35, record.governanceIssues.length * 0.12);
      reasons.push("governance_issue_signal");
    }
    if (classification === "successful" && !record.learnableValue.reusableValue) {
      score -= 0.3;
      reasons.push("trivial_success_penalty");
    }

    const relevanceScore = clamp01(score);
    const shouldCapture = relevanceScore >= 0.45;
    return {
      shouldCapture,
      relevanceScore,
      reasons,
    };
  }
}
