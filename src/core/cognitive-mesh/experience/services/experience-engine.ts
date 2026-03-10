import type { ExperienceCaptureFacts, ExperienceCategory, ExperienceOutcomeLabel, ExperienceRecord, ExperienceType } from "../types/experience.types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueSorted(items: ReadonlyArray<string>): string[] {
  return [...new Set(items.filter((item) => typeof item === "string" && item.trim().length > 0))].sort();
}

function toRounded(value: number): number {
  return Number(value.toFixed(4));
}

interface ExperienceCanonicalClassification {
  type: ExperienceType;
  category: ExperienceCategory;
  outcome: ExperienceOutcomeLabel;
}

function classifyExperience(record: ExperienceRecord): ExperienceCanonicalClassification {
  const signals = new Set(record.relatedSignals);
  const hasVerificationRejection =
    record.verification.verdict === "reject" ||
    record.action.capabilityStatus === "denied" ||
    record.action.capabilityStatus === "blocked";
  const hasPositiveReinforcement = record.relatedReinforcementEvents.some((event) => event.delta >= 0.2);
  const hasNegativeReinforcement = record.relatedReinforcementEvents.some((event) => event.delta <= -0.2);
  if (record.situation.sourceType === "runtime.recall" && record.experienceMetadata.recallOutcome === "success") {
    return { type: "recall", category: "recall_success", outcome: "positive" };
  }
  if (record.situation.sourceType === "runtime.recall" && record.experienceMetadata.recallOutcome === "misfire") {
    return { type: "recall", category: "recall_misfire", outcome: "warning" };
  }
  if (signals.has("drift_detected")) {
    return { type: "anomaly", category: "drift_detected", outcome: "negative" };
  }
  if (signals.has("integrity_warning")) {
    return { type: "anomaly", category: "anomaly_detected", outcome: "warning" };
  }
  if (hasVerificationRejection) {
    return { type: "verification", category: "verification_rejection", outcome: "rejected" };
  }
  if (hasNegativeReinforcement) {
    return { type: "reinforcement", category: "reinforcement_negative", outcome: "negative" };
  }
  if (hasPositiveReinforcement) {
    return { type: "reinforcement", category: "reinforcement_positive", outcome: "positive" };
  }
  if (
    record.outcome.classification === "successful-with-fallback" ||
    record.outcome.classification === "partial" ||
    record.action.capabilityStatus === "degraded_success"
  ) {
    return { type: "execution", category: "execution_degraded", outcome: "degraded" };
  }
  if (
    record.outcome.classification === "failed" ||
    record.outcome.classification === "aborted" ||
    record.outcome.classification === "guarded"
  ) {
    return { type: "execution", category: "execution_failure", outcome: "negative" };
  }
  return { type: "execution", category: "execution_success", outcome: "positive" };
}

function scoreExperience(record: ExperienceRecord, classification: ExperienceCanonicalClassification): { score: number; confidence: number } {
  let score = 0.5;
  let confidence = 0.6;

  const severityFromSignals = record.relatedSignals.reduce((acc, signal) => {
    if (signal === "verification_rejected" || signal === "guard_block" || signal === "drift_detected") {
      return acc + 0.15;
    }
    if (signal === "integrity_warning" || signal === "verification_warning" || signal === "degraded_execution") {
      return acc + 0.08;
    }
    return acc;
  }, 0);

  if (classification.category === "execution_success") {
    score += 0.45;
    confidence += 0.2;
  } else if (classification.category === "execution_degraded") {
    score += 0.12;
    confidence += 0.08;
  } else if (classification.category === "reinforcement_positive") {
    score += 0.3;
    confidence += 0.1;
  } else if (classification.category === "recall_success") {
    score += 0.25;
    confidence += 0.12;
  } else if (classification.category === "verification_rejection") {
    score -= 0.35;
    confidence += 0.08;
  } else if (classification.category === "execution_failure") {
    score -= 0.28;
    confidence += 0.05;
  } else if (classification.category === "anomaly_detected" || classification.category === "drift_detected") {
    score -= 0.4;
    confidence += 0.1;
  } else if (classification.category === "reinforcement_negative" || classification.category === "recall_misfire") {
    score -= 0.25;
    confidence += 0.06;
  }

  const reinforcementDelta = record.relatedReinforcementEvents.reduce((acc, item) => acc + item.delta, 0);
  score += clamp(reinforcementDelta, -0.4, 0.4) * 0.5;
  score -= severityFromSignals * 0.35;

  return {
    score: toRounded(clamp(score, -1, 1)),
    confidence: toRounded(clamp(confidence, 0, 1)),
  };
}

export class ExperienceEngine {
  finalize(record: ExperienceRecord, facts: ExperienceCaptureFacts): ExperienceRecord {
    const relatedSignals = uniqueSorted([...(record.relatedSignals ?? []), ...(facts.relatedSignals ?? [])]);
    const relatedReinforcementEvents = [...(facts.relatedReinforcementEvents ?? record.relatedReinforcementEvents ?? [])]
      .map((event) => ({
        memoryId: event.memoryId,
        delta: toRounded(event.delta),
        trend: event.trend,
        reasonCodes: [...new Set(event.reasonCodes)].sort(),
        timestamp: event.timestamp,
      }))
      .sort((a, b) => a.memoryId.localeCompare(b.memoryId));
    const withRelations: ExperienceRecord = {
      ...record,
      sourceCapability: facts.action.capabilityId ?? record.sourceCapability,
      relatedMemoryId: facts.relatedMemoryId ?? record.relatedMemoryId,
      relatedExecutionId: facts.relatedExecutionId ?? facts.source.eventId ?? record.relatedExecutionId,
      relatedSignals,
      relatedReinforcementEvents,
      experienceTags: uniqueSorted([...(record.experienceTags ?? []), ...(facts.tags ?? [])]),
      experienceMetadata: {
        ...(record.experienceMetadata ?? {}),
        ...(facts.experienceMetadata ?? {}),
        recallOutcome: facts.recallOutcome,
      },
    };
    const canonical = classifyExperience(withRelations);
    const scored = scoreExperience(withRelations, canonical);
    return {
      ...withRelations,
      experienceType: canonical.type,
      experienceCategory: canonical.category,
      experienceOutcome: canonical.outcome,
      experienceScore: scored.score,
      experienceConfidence: scored.confidence,
    };
  }
}

