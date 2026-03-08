"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveAttentionEngine = void 0;
const attention_score_1 = require("./attention-score");
const WEIGHTS = {
    urgency: 0.26,
    uncertainty: 0.14,
    risk: 0.24,
    novelty: 0.08,
    userImpact: 0.18,
    strategicValue: 0.1,
    deadlinePressure: 0.16,
};
class CognitiveAttentionEngine {
    constructor(options) {
        this.now = options?.now ?? (() => Date.now());
    }
    evaluate(input) {
        const computedAtTs = this.now();
        const urgency = (0, attention_score_1.clamp01)(input.urgency);
        const uncertainty = (0, attention_score_1.clamp01)(input.uncertainty);
        const risk = (0, attention_score_1.clamp01)(input.risk);
        const novelty = (0, attention_score_1.clamp01)(input.novelty);
        const userImpact = (0, attention_score_1.clamp01)(input.userImpact);
        const strategicValue = (0, attention_score_1.clamp01)(input.strategicValue);
        const deadlinePressure = (0, attention_score_1.computeDeadlinePressure)(input.deadlineTs, computedAtTs);
        const raw = urgency * WEIGHTS.urgency +
            uncertainty * WEIGHTS.uncertainty +
            risk * WEIGHTS.risk +
            novelty * WEIGHTS.novelty +
            userImpact * WEIGHTS.userImpact +
            strategicValue * WEIGHTS.strategicValue +
            deadlinePressure * WEIGHTS.deadlinePressure;
        const score = Math.round((0, attention_score_1.clamp01)(raw) * 100);
        const band = (0, attention_score_1.toAttentionBand)(score);
        const reasons = [];
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
    rank(inputs) {
        return inputs
            .map((item) => this.evaluate(item))
            .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    }
    top(inputs, count = 1) {
        if (count <= 0) {
            return [];
        }
        return this.rank(inputs).slice(0, count);
    }
}
exports.CognitiveAttentionEngine = CognitiveAttentionEngine;
