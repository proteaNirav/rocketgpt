"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatFeedbackService = void 0;
class CatFeedbackService {
    build(input) {
        return {
            feedbackId: `catfb-${input.eventId}`,
            sessionId: input.sessionId,
            capabilityId: input.capabilityId,
            learnerInput: input.learnerInput,
            guardrailsApplied: [...input.guardrailsApplied],
            memoryPacketId: input.execution.packet?.packetId,
            memoryInjectedIds: [...input.execution.trace.selectedMemoryIds],
            actionSummary: input.actionSummary,
            outcome: this.mapOutcome(input.outcomeSummary.usefulness),
            reflection: `${input.outcomeSummary.note};memory_selection=${input.execution.trace.selectionReason}`,
            confidence: input.confidence,
            createdAt: new Date().toISOString(),
            metadata: {
                memoryInjectionStatus: input.execution.decision.status,
                memorySelectionReason: input.execution.trace.selectionReason,
                experienceReuseHint: input.execution.trace.experienceReuseDecision.hint,
                memoryUsefulness: input.outcomeSummary.usefulness,
                reuseRecommendation: input.outcomeSummary.recommendation,
            },
        };
    }
    mapOutcome(usefulness) {
        if (usefulness === "helpful") {
            return "successful";
        }
        if (usefulness === "neutral") {
            return "partial";
        }
        if (usefulness === "harmful") {
            return "failed";
        }
        return "guarded";
    }
}
exports.CatFeedbackService = CatFeedbackService;
