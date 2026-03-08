"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatMemoryAdoptionService = void 0;
const MEMORY_ENABLED_CAPABILITY_TOKENS = ["language", "retrieval", "verification"];
function isMemoryEnabledCapability(capabilityId) {
    const normalized = capabilityId.toLowerCase();
    return MEMORY_ENABLED_CAPABILITY_TOKENS.some((token) => normalized === token || normalized.includes(token));
}
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
class CatMemoryAdoptionService {
    constructor(memoryService, options) {
        this.memoryService = memoryService;
        this.options = options;
    }
    prepare(input) {
        if (!input.enabled) {
            return this.disabled("memory_service_disabled");
        }
        if (input.motivatedRecall && !input.motivatedRecall.enableRecall) {
            return this.disabled("motivated_recall_disabled");
        }
        if (!isMemoryEnabledCapability(input.capabilityId)) {
            return this.skipCapability("capability_not_memory_enabled");
        }
        const prior = this.options.experienceProvider(input.event.sessionId, input.capabilityId, 20);
        const reuseDecision = this.decideExperienceReuse(prior);
        const recallMode = input.motivatedRecall?.recallMode ?? "hybrid";
        const adoptedRecall = this.memoryService.recallAdoptedMemory({
            sessionId: input.event.sessionId,
            query: input.event.normalizedInput,
            intentHint: input.event.normalizedInput,
            routeType: input.routeType,
            capabilityId: input.capabilityId,
            riskScore: input.riskScore,
            maxItems: 4,
        });
        const explicit = recallMode === "explicit" || recallMode === "hybrid"
            ? this.memoryService.explicitRecallSearch({
                sessionId: input.event.sessionId,
                capabilityId: input.capabilityId,
                query: input.event.normalizedInput,
                limit: 2,
                minRelevance: 0.45,
            })
            : { items: [], recallEvent: undefined };
        const implicit = recallMode === "implicit" || recallMode === "hybrid"
            ? this.memoryService.implicitResurface({
                sessionId: input.event.sessionId,
                sourceType: input.sourceType,
                routeType: input.routeType,
                intentHint: input.event.normalizedInput,
                riskScore: input.riskScore,
                threshold: reuseDecision.hint === "do_not_prioritize" ? 0.82 : 0.72,
                limit: 2,
            })
            : { items: [], recallEvent: undefined };
        const baseFloor = 0.66;
        const relevanceFloor = clamp01(baseFloor +
            (reuseDecision.hint === "prefer_next_time" ? -0.08 : 0) +
            (reuseDecision.hint === "use_cautiously" ? 0.05 : 0) +
            (reuseDecision.hint === "do_not_prioritize" ? 0.12 : 0));
        const packet = this.memoryService.buildMemoryPacket({
            sessionId: input.event.sessionId,
            capabilityId: input.capabilityId,
            purpose: input.purpose,
            entitlement: {
                allowInjection: true,
            },
        }, {
            query: input.event.normalizedInput,
            limit: Math.max(1, Math.min(4, this.options.maxPacketItems ?? 3)),
            relevanceFloor,
        });
        const selectedMemoryIds = packet.memoryItems.map((item) => item.memoryId);
        if (selectedMemoryIds.length === 0) {
            return {
                decision: {
                    injected: false,
                    status: "skipped_threshold",
                    reason: "memory_threshold_not_met",
                    relevanceFloor,
                    packetItemCount: 0,
                },
                trace: {
                    explicitRecallCount: explicit.items.length,
                    implicitRecallCount: implicit.items.length,
                    selectedMemoryIds: [],
                    selectionReason: "no_memory_above_threshold",
                    motivatedRecallMode: recallMode,
                    experienceReuseDecision: reuseDecision,
                },
            };
        }
        return {
            packet,
            decision: {
                injected: true,
                status: "injected",
                reason: "memory_packet_selected",
                relevanceFloor,
                packetItemCount: selectedMemoryIds.length,
            },
            trace: {
                explicitRecallCount: explicit.items.length,
                implicitRecallCount: implicit.items.length,
                selectedMemoryIds,
                packetId: packet.packetId,
                selectionReason: `bounded_ranked_selection:${reuseDecision.hint}:eligible=${adoptedRecall.items.length}:excluded=${adoptedRecall.diagnostics.excludedCount}`,
                motivatedRecallMode: recallMode,
                experienceReuseDecision: reuseDecision,
            },
        };
    }
    summarizeOutcome(input) {
        if (!input.execution.decision.injected) {
            return {
                usefulness: "uncertain",
                recommendation: "insufficient_evidence",
                note: "no_packet_injected",
            };
        }
        const disposition = input.verificationDisposition;
        const status = input.capabilityStatus;
        if (status === "success" && disposition === "passed" && input.accepted !== false) {
            return {
                usefulness: "helpful",
                recommendation: "prefer_next_time",
                note: "successful_with_trusted_verification",
            };
        }
        if (status === "success" && (disposition === "downgraded" || disposition === "inconclusive")) {
            return {
                usefulness: "neutral",
                recommendation: "use_cautiously",
                note: "success_with_non_trusted_disposition",
            };
        }
        if (status === "failed" || disposition === "failed") {
            return {
                usefulness: "harmful",
                recommendation: "do_not_prioritize",
                note: "failure_or_verification_failure",
            };
        }
        return {
            usefulness: "uncertain",
            recommendation: "insufficient_evidence",
            note: "insufficient_signal",
        };
    }
    decideExperienceReuse(prior) {
        if (prior.length === 0) {
            return {
                influenced: false,
                signalScore: 0,
                hint: "insufficient_evidence",
                basis: "no_prior_experience",
            };
        }
        const positive = prior.filter((item) => item.outcome.status === "positive").length;
        const negative = prior.filter((item) => item.outcome.status === "negative").length;
        const score = clamp01((positive - negative + prior.length) / (2 * prior.length));
        if (score >= 0.7) {
            return {
                influenced: true,
                signalScore: score,
                hint: "prefer_next_time",
                basis: "prior_positive_dominant",
            };
        }
        if (score <= 0.35) {
            return {
                influenced: true,
                signalScore: score,
                hint: "do_not_prioritize",
                basis: "prior_negative_dominant",
            };
        }
        return {
            influenced: true,
            signalScore: score,
            hint: "use_cautiously",
            basis: "mixed_prior_signal",
        };
    }
    disabled(reason) {
        return {
            decision: {
                injected: false,
                status: "disabled",
                reason,
                relevanceFloor: 1,
                packetItemCount: 0,
            },
            trace: {
                explicitRecallCount: 0,
                implicitRecallCount: 0,
                selectedMemoryIds: [],
                selectionReason: reason,
                experienceReuseDecision: {
                    influenced: false,
                    signalScore: 0,
                    hint: "insufficient_evidence",
                    basis: "memory_disabled",
                },
            },
        };
    }
    skipCapability(reason) {
        return {
            decision: {
                injected: false,
                status: "skipped_capability",
                reason,
                relevanceFloor: 1,
                packetItemCount: 0,
            },
            trace: {
                explicitRecallCount: 0,
                implicitRecallCount: 0,
                selectedMemoryIds: [],
                selectionReason: reason,
                experienceReuseDecision: {
                    influenced: false,
                    signalScore: 0,
                    hint: "insufficient_evidence",
                    basis: "capability_not_enabled",
                },
            },
        };
    }
}
exports.CatMemoryAdoptionService = CatMemoryAdoptionService;
