import { clamp01, computeDeadlinePressure, toAttentionBand } from "./attention-score";
import type { AttentionInput, AttentionResult } from "./attention-types";

export interface CognitiveAttentionEngineOptions {
  now?: () => number;
}

const WEIGHTS = {
  urgency: 0.26,
  uncertainty: 0.14,
  risk: 0.24,
  novelty: 0.08,
  userImpact: 0.18,
  strategicValue: 0.1,
  deadlinePressure: 0.16,
};

export class CognitiveAttentionEngine {
  private readonly now: () => number;

  constructor(options?: CognitiveAttentionEngineOptions) {
    this.now = options?.now ?? (() => Date.now());
  }

  evaluate(input: AttentionInput): AttentionResult {
    const computedAtTs = this.now();
    const urgency = clamp01(input.urgency);
    const uncertainty = clamp01(input.uncertainty);
    const risk = clamp01(input.risk);
    const novelty = clamp01(input.novelty);
    const userImpact = clamp01(input.userImpact);
    const strategicValue = clamp01(input.strategicValue);
    const deadlinePressure = computeDeadlinePressure(input.deadlineTs, computedAtTs);

    const raw =
      urgency * WEIGHTS.urgency +
      uncertainty * WEIGHTS.uncertainty +
      risk * WEIGHTS.risk +
      novelty * WEIGHTS.novelty +
      userImpact * WEIGHTS.userImpact +
      strategicValue * WEIGHTS.strategicValue +
      deadlinePressure * WEIGHTS.deadlinePressure;
    const score = Math.round(clamp01(raw) * 100);
    const band = toAttentionBand(score);

    const reasons: string[] = [];
    if (urgency >= 0.8) {
      reasons.push("high_urgency");
    }
    if (risk >= 0.75) {
      reasons.push("high_risk");
    }
    if (uncertainty >= 0.7) {
      reasons.push("uncertainty_elevated");
    }
    if (deadlinePressure >= 0.75) {
      reasons.push("near_deadline");
    }
    if (reasons.length === 0) {
      reasons.push("baseline_attention");
    }

    return {
      id: input.id,
      score,
      band,
      reasons,
      computedAtTs,
    };
  }

  rank(inputs: AttentionInput[]): AttentionResult[] {
    return inputs
      .map((item) => this.evaluate(item))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  }

  top(inputs: AttentionInput[], count = 1): AttentionResult[] {
    if (count <= 0) {
      return [];
    }
    return this.rank(inputs).slice(0, count);
  }
}

