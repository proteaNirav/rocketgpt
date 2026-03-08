"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivatedRecallEngine = void 0;
const motivated_recall_ranking_1 = require("./motivated-recall-ranking");
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
class MotivatedRecallEngine {
    constructor(options = {}) {
        this.ranking = options.ranking ?? new motivated_recall_ranking_1.MotivatedRecallRanking();
        this.defaultThresholdLow = clamp01(options.thresholdLow ?? 0.3);
        this.defaultThresholdHigh = clamp01(options.thresholdHigh ?? 0.65);
    }
    decide(input) {
        const thresholdLow = clamp01(input.thresholds?.low ?? this.defaultThresholdLow);
        const thresholdHigh = clamp01(input.thresholds?.high ?? this.defaultThresholdHigh);
        const breakdown = this.ranking.score(input.signals);
        let recallMode = "none";
        const reasons = [];
        if (breakdown.finalScore < thresholdLow) {
            recallMode = "none";
            reasons.push("below_threshold_low");
        }
        else if (breakdown.finalScore < thresholdHigh) {
            recallMode = "implicit";
            reasons.push("between_thresholds");
        }
        else {
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
exports.MotivatedRecallEngine = MotivatedRecallEngine;
