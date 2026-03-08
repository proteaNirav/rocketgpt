"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceSynthesisService = void 0;
const experience_reuse_ranking_1 = require("./experience-reuse-ranking");
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
let synthesizedSequence = 0;
class ExperienceSynthesisService {
    constructor() {
        this.reuseRanking = new experience_reuse_ranking_1.ExperienceReuseRanking();
    }
    synthesize(feedback, record, priorExperiences) {
        const reuse = this.buildReuseScore(record, priorExperiences);
        synthesizedSequence += 1;
        const now = new Date().toISOString();
        return {
            memory: {
                memoryId: `mem-exp-${feedback.sessionId}-${synthesizedSequence}`,
                sessionId: feedback.sessionId,
                layer: "decision_linked",
                content: this.buildContent(feedback, record, reuse),
                tags: [
                    { key: "category", value: "cat_feedback" },
                    { key: "capability_id", value: feedback.capabilityId },
                    { key: "outcome", value: feedback.outcome },
                    { key: "caution", value: reuse.cautionLevel },
                ],
                links: [],
                provenance: {
                    source: "experience_synthesis",
                },
                scores: {
                    importance: clamp01(record?.relevanceScore ?? 0.5),
                    novelty: clamp01(record?.learnableValue.level === "high" ? 0.8 : 0.45),
                    confidence: clamp01(feedback.confidence ?? record?.verification.confidence ?? 0.6),
                    reuse: reuse.reuseBoost,
                    relevance: clamp01(record?.relevanceScore ?? 0.45),
                    recency: 1,
                    crossDomainUsefulness: clamp01((record?.tags.some((tag) => tag.startsWith("mode:workflow")) ? 0.7 : 0.4) + reuse.reuseBoost * 0.2),
                },
                createdAt: now,
                updatedAt: now,
                metadata: {
                    feedbackId: feedback.feedbackId,
                    experienceId: record?.experienceId,
                    guardrailsApplied: [...feedback.guardrailsApplied],
                    memoryInjectedIds: [...feedback.memoryInjectedIds],
                    rationale: [...reuse.rationale],
                },
            },
            reuse,
        };
    }
    buildReuseScore(record, priorExperiences) {
        const baseline = this.reuseRanking.assess(priorExperiences);
        const recordPositiveBoost = record?.outcome.status === "positive" ? 0.15 : 0;
        const recordNegativePenalty = record?.outcome.status === "negative" ? 0.2 : 0;
        const reuseBoost = clamp01(baseline.reuseBoost + recordPositiveBoost - recordNegativePenalty);
        const cautionPenalty = clamp01(baseline.cautionPenalty + recordNegativePenalty);
        let cautionLevel = "none";
        if (cautionPenalty >= 0.75) {
            cautionLevel = "high";
        }
        else if (cautionPenalty >= 0.5) {
            cautionLevel = "medium";
        }
        else if (cautionPenalty >= 0.25) {
            cautionLevel = "low";
        }
        return {
            reuseBoost,
            cautionLevel,
            rationale: [...baseline.rationale],
        };
    }
    buildContent(feedback, record, reuse) {
        const experienceSummary = record
            ? `experience=${record.outcome.classification},verification=${record.verification.verdict ?? "na"}`
            : "experience=none";
        return [
            `cat=${feedback.capabilityId}`,
            `outcome=${feedback.outcome}`,
            `reuse_boost=${reuse.reuseBoost.toFixed(2)}`,
            `caution=${reuse.cautionLevel}`,
            experienceSummary,
            `action=${feedback.actionSummary}`,
        ].join(" | ");
    }
}
exports.ExperienceSynthesisService = ExperienceSynthesisService;
