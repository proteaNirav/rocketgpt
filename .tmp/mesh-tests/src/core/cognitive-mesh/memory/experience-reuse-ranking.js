"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceReuseRanking = void 0;
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
class ExperienceReuseRanking {
    assess(records) {
        if (records.length === 0) {
            return {
                reuseBoost: 0,
                cautionPenalty: 0,
                rationale: ["no_prior_experience"],
            };
        }
        const successful = records.filter((record) => record.outcome.status === "positive").length;
        const negative = records.filter((record) => record.outcome.status === "negative").length;
        const guarded = records.filter((record) => record.outcome.classification === "guarded").length;
        const fallback = records.filter((record) => record.circumstances.fallbackTriggered).length;
        const successRate = successful / records.length;
        const negativeRate = negative / records.length;
        const guardedRate = guarded / records.length;
        const fallbackRate = fallback / records.length;
        const reuseBoost = clamp01(successRate * 0.7 + (1 - fallbackRate) * 0.3);
        const cautionPenalty = clamp01(negativeRate * 0.7 + guardedRate * 0.3);
        const rationale = [
            `success_rate:${successRate.toFixed(2)}`,
            `negative_rate:${negativeRate.toFixed(2)}`,
            `fallback_rate:${fallbackRate.toFixed(2)}`,
        ];
        return {
            reuseBoost,
            cautionPenalty,
            rationale,
        };
    }
}
exports.ExperienceReuseRanking = ExperienceReuseRanking;
