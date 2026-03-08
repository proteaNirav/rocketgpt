import type { MotivatedRecallSignalSet } from "./motivated-recall.types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function avg(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export interface MotivatedRecallScoreBreakdown {
  contextScore: number;
  experienceScore: number;
  systemScore: number;
  dreamScore: number;
  finalScore: number;
  confidence: number;
  triggeredSignals: string[];
}

export class MotivatedRecallRanking {
  score(signals: MotivatedRecallSignalSet): MotivatedRecallScoreBreakdown {
    const normalized = {
      goalRelevance: clamp01(signals.goalRelevance),
      riskIndicator: clamp01(signals.riskIndicator),
      repetitionIndicator: clamp01(signals.repetitionIndicator),
      unresolvedContextRelevance: clamp01(signals.unresolvedContextRelevance),
      priorExperienceUsefulness: clamp01(signals.priorExperienceUsefulness),
      experienceLayerMatch: clamp01(signals.experienceLayerMatch),
      learnerOutputRelevance: clamp01(signals.learnerOutputRelevance),
      analysisResultRelevance: clamp01(signals.analysisResultRelevance),
      catHelpSignal: clamp01(signals.catHelpSignal),
      repairRequirementSignal: clamp01(signals.repairRequirementSignal),
      creativeNeedSignal: clamp01(signals.creativeNeedSignal),
      dreamMemoryRelevance: clamp01(signals.dreamMemoryRelevance),
    };

    const contextScore = avg([
      normalized.goalRelevance,
      normalized.repetitionIndicator,
      normalized.unresolvedContextRelevance,
    ]);
    const experienceScore = avg([
      normalized.priorExperienceUsefulness,
      normalized.experienceLayerMatch,
      normalized.learnerOutputRelevance,
      normalized.analysisResultRelevance,
    ]);
    const systemScore = avg([
      normalized.catHelpSignal,
      normalized.repairRequirementSignal,
      normalized.creativeNeedSignal,
    ]);
    const dreamScore = normalized.dreamMemoryRelevance;

    const finalScore =
      contextScore * 0.34 +
      experienceScore * 0.36 +
      systemScore * 0.22 +
      dreamScore * 0.08;

    const triggeredSignals = Object.entries(normalized)
      .filter(([, value]) => value >= 0.55)
      .map(([key]) => key)
      .sort();

    const confidence = clamp01(avg([contextScore, experienceScore, systemScore, Math.max(dreamScore, 0.2)]));

    return {
      contextScore: clamp01(contextScore),
      experienceScore: clamp01(experienceScore),
      systemScore: clamp01(systemScore),
      dreamScore: clamp01(dreamScore),
      finalScore: clamp01(finalScore),
      confidence,
      triggeredSignals,
    };
  }
}
