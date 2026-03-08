"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitivePriorityEngine = void 0;
const attention_score_1 = require("../attention/attention-score");
const SCORE_WEIGHTS = {
    attention: 0.28,
    urgency: 0.2,
    importance: 0.18,
    blockingFactor: 0.14,
    deadline: 0.2,
    freshness: 0.08,
    estimatedCostPenalty: 0.1,
};
class CognitivePriorityEngine {
    constructor(options) {
        this.now = options?.now ?? (() => Date.now());
        this.costReference = options?.costReference ?? 1000;
    }
    evaluate(candidate) {
        const computedAtTs = this.now();
        const attention = (0, attention_score_1.clamp01)(candidate.attentionScore / 100);
        const urgency = (0, attention_score_1.clamp01)(candidate.urgency);
        const importance = (0, attention_score_1.clamp01)(candidate.importance);
        const blockingFactor = (0, attention_score_1.clamp01)(candidate.blockingFactor);
        const deadlinePressure = (0, attention_score_1.computeDeadlinePressure)(candidate.deadlineTs, computedAtTs);
        const freshness = this.computeFreshness(candidate.createdAtTs, computedAtTs);
        const retryPenalty = Math.min(0.35, Math.max(0, candidate.retryCount) * 0.08);
        const costPenalty = (0, attention_score_1.clamp01)(candidate.estimatedCost / this.costReference);
        const weighted = attention * SCORE_WEIGHTS.attention +
            urgency * SCORE_WEIGHTS.urgency +
            importance * SCORE_WEIGHTS.importance +
            blockingFactor * SCORE_WEIGHTS.blockingFactor +
            deadlinePressure * SCORE_WEIGHTS.deadline +
            freshness * SCORE_WEIGHTS.freshness -
            costPenalty * SCORE_WEIGHTS.estimatedCostPenalty -
            retryPenalty;
        const priorityScore = Math.round((0, attention_score_1.clamp01)(weighted) * 100);
        const queueClass = this.resolveQueueClass(priorityScore, deadlinePressure);
        const reasons = this.buildReasons({
            attention,
            urgency,
            importance,
            deadlinePressure,
            retryPenalty,
            costPenalty,
        });
        return {
            id: candidate.id,
            priorityScore,
            queueClass,
            reasons,
            computedAtTs,
        };
    }
    rank(candidates) {
        return candidates
            .map((candidate) => this.evaluate(candidate))
            .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
    }
    top(candidates, count = 1) {
        if (count <= 0) {
            return [];
        }
        return this.rank(candidates).slice(0, count);
    }
    resolveQueueClass(priorityScore, deadlinePressure) {
        if (deadlinePressure >= 0.95) {
            return "p0";
        }
        if (priorityScore >= 82 || deadlinePressure >= 0.85) {
            return "p0";
        }
        if (priorityScore >= 62 || deadlinePressure >= 0.75) {
            return "p1";
        }
        if (priorityScore >= 40) {
            return "p2";
        }
        return "p3";
    }
    computeFreshness(createdAtTs, nowTs) {
        if (!Number.isFinite(createdAtTs) || createdAtTs <= 0) {
            return 0;
        }
        const ageMs = Math.max(0, nowTs - createdAtTs);
        if (ageMs <= 60 * 1000) {
            return 1;
        }
        if (ageMs <= 5 * 60 * 1000) {
            return 0.7;
        }
        if (ageMs <= 30 * 60 * 1000) {
            return 0.4;
        }
        return 0.1;
    }
    buildReasons(inputs) {
        const reasons = [];
        if (inputs.attention >= 0.75) {
            reasons.push("high_attention");
        }
        if (inputs.urgency >= 0.8) {
            reasons.push("high_urgency");
        }
        if (inputs.importance >= 0.8) {
            reasons.push("high_importance");
        }
        if (inputs.deadlinePressure >= 0.75) {
            reasons.push("near_deadline");
        }
        if (inputs.retryPenalty > 0) {
            reasons.push("retry_penalty_applied");
        }
        if (inputs.costPenalty >= 0.7) {
            reasons.push("high_estimated_cost");
        }
        if (reasons.length === 0) {
            reasons.push("baseline_priority");
        }
        return reasons;
    }
}
exports.CognitivePriorityEngine = CognitivePriorityEngine;
