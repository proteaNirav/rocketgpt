"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMemoryService = void 0;
const conversation_memory_capture_1 = require("./conversation-memory-capture");
const adopted_recall_foundation_1 = require("./adopted-recall-foundation");
const experience_synthesis_service_1 = require("./experience-synthesis-service");
const explicit_recall_engine_1 = require("./explicit-recall-engine");
const implicit_resurfacing_engine_1 = require("./implicit-resurfacing-engine");
const memory_packet_service_1 = require("./memory-packet-service");
const memory_reinforcement_scoring_1 = require("./memory-reinforcement-scoring");
const in_memory_cognitive_memory_repository_1 = require("./repository/in-memory-cognitive-memory-repository");
class CognitiveMemoryService {
    constructor(repository = new in_memory_cognitive_memory_repository_1.InMemoryCognitiveMemoryRepository(), options = {}) {
        this.repository = repository;
        this.capture = new conversation_memory_capture_1.ConversationMemoryCapture(this.repository);
        this.explicitRecall = new explicit_recall_engine_1.ExplicitRecallEngine(this.repository);
        this.implicitResurfacing = new implicit_resurfacing_engine_1.ImplicitResurfacingEngine(this.repository);
        this.packetService = new memory_packet_service_1.MemoryPacketService(this.repository);
        this.synthesis = new experience_synthesis_service_1.ExperienceSynthesisService();
        this.adoptedRecallFoundation = new adopted_recall_foundation_1.AdoptedRecallFoundation();
        this.reinforcementScoring = new memory_reinforcement_scoring_1.MemoryReinforcementScoring();
        this.experienceProvider = options.experienceProvider;
    }
    startSession(session) {
        this.capture.upsertSession(session);
    }
    captureConversationMessage(message) {
        this.capture.captureMessage(message);
    }
    explicitRecallSearch(query) {
        return this.explicitRecall.recall(query);
    }
    implicitResurface(input) {
        return this.implicitResurfacing.resurface(input);
    }
    buildMemoryPacket(context, options) {
        return this.packetService.buildPacket(context, options);
    }
    recallAdoptedMemory(input) {
        const items = this.repository.listMemoryBySession(input.sessionId);
        return this.adoptedRecallFoundation.recall({
            sessionId: input.sessionId,
            items,
            query: input.query,
            intentHint: input.intentHint,
            routeType: input.routeType,
            capabilityId: input.capabilityId,
            riskScore: input.riskScore,
            maxItems: input.maxItems,
        });
    }
    synthesizeExperienceFeedback(feedback, currentExperience, options = {}) {
        const prior = this.experienceProvider
            ? this.experienceProvider(feedback.sessionId, currentExperience?.action.capabilityId, options.priorByCapabilityLimit ?? 20)
            : currentExperience
                ? [currentExperience]
                : [];
        const synthesized = this.synthesis.synthesize(feedback, currentExperience, prior);
        this.repository.saveMemory(synthesized.memory);
    }
    upsertUnresolved(item) {
        this.repository.upsertUnresolved(item);
    }
    saveMemoryItem(memory) {
        this.repository.saveMemory(memory);
    }
    reinforceMemory(input) {
        const existing = this.repository.findMemoryById(input.memoryId);
        if (!existing) {
            return undefined;
        }
        const currentScore = typeof existing.metadata?.reinforcementScore === "number"
            ? existing.metadata.reinforcementScore
            : undefined;
        const currentEvents = typeof existing.metadata?.reinforcementEvents === "number"
            ? existing.metadata.reinforcementEvents
            : undefined;
        const outcome = this.reinforcementScoring.evaluate({
            ...input,
            currentScore,
            currentEvents,
        });
        const reinforcementState = outcome.state;
        const next = {
            ...existing,
            scores: {
                ...existing.scores,
                reuse: clamp01(existing.scores.reuse + outcome.delta * 0.2),
                relevance: clamp01(existing.scores.relevance + outcome.delta * 0.15),
                confidence: clamp01(existing.scores.confidence + outcome.delta * 0.1),
            },
            updatedAt: reinforcementState.lastReinforcedTimestamp,
            metadata: {
                ...(existing.metadata ? { ...existing.metadata } : {}),
                reinforcementScore: reinforcementState.reinforcementScore,
                reinforcementEvents: reinforcementState.reinforcementEvents,
                reinforcementReasonCodes: [...reinforcementState.reinforcementReasonCodes],
                lastReinforcedTimestamp: reinforcementState.lastReinforcedTimestamp,
                reinforcementConfidence: reinforcementState.reinforcementConfidence,
                reinforcementTrend: reinforcementState.reinforcementTrend,
            },
        };
        this.repository.saveMemory(next);
        return outcome;
    }
    listMemoryBySession(sessionId) {
        return this.repository.listMemoryBySession(sessionId);
    }
    listRecallEventsBySession(sessionId) {
        return this.repository.listRecallEventsBySession(sessionId);
    }
    getRepository() {
        return this.repository;
    }
}
exports.CognitiveMemoryService = CognitiveMemoryService;
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
