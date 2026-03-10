import { MotivatedRecallRanking } from "./motivated-recall-ranking";
import type { MotivatedRecallDecision, MotivatedRecallInput, MotivatedRecallMode } from "./motivated-recall.types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export class MotivatedRecallEngine {
  private readonly ranking: MotivatedRecallRanking;
  private readonly defaultThresholdLow: number;
  private readonly defaultThresholdHigh: number;

  constructor(options: { thresholdLow?: number; thresholdHigh?: number; ranking?: MotivatedRecallRanking } = {}) {
    this.ranking = options.ranking ?? new MotivatedRecallRanking();
    this.defaultThresholdLow = clamp01(options.thresholdLow ?? 0.3);
    this.defaultThresholdHigh = clamp01(options.thresholdHigh ?? 0.65);
  }

  decide(input: MotivatedRecallInput): MotivatedRecallDecision {
    const thresholdLow = clamp01(input.thresholds?.low ?? this.defaultThresholdLow);
    const thresholdHigh = clamp01(input.thresholds?.high ?? this.defaultThresholdHigh);
    const breakdown = this.ranking.score(input.signals);

    let recallMode: MotivatedRecallMode = "none";
    const reasons: string[] = [];
    if (breakdown.finalScore < thresholdLow) {
      recallMode = "none";
      reasons.push("below_threshold_low");
    } else if (breakdown.finalScore < thresholdHigh) {
      recallMode = "implicit";
      reasons.push("between_thresholds");
    } else {
      recallMode = "hybrid";
      reasons.push("above_threshold_high");
    }

    if (input.signals.riskIndicator >= 0.75 && recallMode !== "none") {
      recallMode = "explicit";
      reasons.push("risk_indicator_high_prefers_explicit");
    }

    if (input.signals.repairRequirementSignal >= 0.7 && recallMode === "none") {
      recallMode = "implicit";
      reasons.push("repair_requirement_forced_implicit");
    }

    return {
      enableRecall: recallMode !== "none",
      recallMode,
      score: breakdown.finalScore,
      confidence: breakdown.confidence,
      reasons,
      signalsTriggered: breakdown.triggeredSignals,
    };
  }
}
