"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationMemoryCapture = void 0;
const memory_ranking_1 = require("./memory-ranking");
let messageSequence = 0;
let memorySequence = 0;
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}
function computeRecency(createdAt) {
    const ageMs = Math.max(0, Date.now() - Date.parse(createdAt));
    const halfLifeMs = 1000 * 60 * 45;
    return clamp01(1 / (1 + ageMs / halfLifeMs));
}
class ConversationMemoryCapture {
    constructor(repository) {
        this.repository = repository;
        this.ranking = new memory_ranking_1.MemoryRanking();
    }
    upsertSession(session) {
        this.repository.upsertSession(session);
    }
    captureMessage(input) {
        messageSequence += 1;
        const createdAt = input.createdAt ?? new Date().toISOString();
        const message = {
            ...input,
            messageId: `msg-${input.sessionId}-${messageSequence}`,
            createdAt,
            tags: input.tags ? [...input.tags] : undefined,
            metadata: input.metadata ? { ...input.metadata } : undefined,
        };
        this.repository.saveMessage(message);
        memorySequence += 1;
        const layer = this.classifyMemoryLayer(message);
        const tags = [
            { key: "role", value: message.role },
            { key: "source", value: message.source },
        ];
        if (message.metadata?.routeType && typeof message.metadata.routeType === "string") {
            tags.push({ key: "route_type", value: message.metadata.routeType });
        }
        const memory = {
            memoryId: `mem-${message.sessionId}-${memorySequence}`,
            sessionId: message.sessionId,
            layer,
            content: message.content,
            tags,
            links: [],
            provenance: {
                source: "conversation_capture",
                sourceMessageId: message.messageId,
            },
            scores: {
                importance: this.estimateImportance(message),
                novelty: this.estimateNovelty(message),
                confidence: 0.85,
                reuse: this.estimateReuse(message),
                relevance: this.estimateRelevance(message),
                recency: computeRecency(createdAt),
                crossDomainUsefulness: this.estimateCrossDomainUsefulness(message),
            },
            createdAt,
            updatedAt: createdAt,
            metadata: {
                source: message.source,
            },
        };
        this.repository.saveMemory(memory);
        return { message, memory };
    }
    refreshRecency(sessionId) {
        const memories = this.repository.listMemoryBySession(sessionId);
        for (const memory of memories) {
            this.repository.saveMemory({
                ...memory,
                scores: {
                    ...memory.scores,
                    recency: computeRecency(memory.createdAt),
                },
                updatedAt: new Date().toISOString(),
            });
        }
    }
    classifyMemoryLayer(message) {
        const text = message.content.toLowerCase();
        if (text.includes("todo") || text.includes("follow up") || text.includes("unresolved")) {
            return "unresolved";
        }
        if (text.includes("decision") || text.includes("choose") || text.includes("selected")) {
            return "decision_linked";
        }
        if (text.includes("bridge") || text.includes("across") || text.includes("domain")) {
            return "cross_domain_bridge";
        }
        if (message.role === "user") {
            return "episodic";
        }
        if (text.length < 80) {
            return "conceptual";
        }
        return "raw_conversation";
    }
    estimateImportance(message) {
        const text = message.content.toLowerCase();
        const keywordBoost = Number(text.includes("urgent")) * 0.2 +
            Number(text.includes("critical")) * 0.2 +
            Number(text.includes("risk")) * 0.15;
        const roleBoost = message.role === "user" ? 0.2 : 0.1;
        return clamp01(0.45 + keywordBoost + roleBoost);
    }
    estimateNovelty(message) {
        const ranked = this.ranking.rank(this.repository.listMemoryBySession(message.sessionId), {
            query: message.content,
        });
        if (ranked.length === 0) {
            return 0.9;
        }
        const top = ranked[0];
        return clamp01(1 - top.score);
    }
    estimateReuse(message) {
        const lengthFactor = clamp01(message.content.length / 220);
        const roleFactor = message.role === "system" ? 0.8 : message.role === "assistant" ? 0.6 : 0.7;
        return clamp01(lengthFactor * 0.5 + roleFactor * 0.5);
    }
    estimateRelevance(message) {
        const hasStructuredHint = message.content.includes(":") || message.content.includes("->");
        return clamp01(0.35 + (hasStructuredHint ? 0.35 : 0.15) + (message.role === "user" ? 0.2 : 0.1));
    }
    estimateCrossDomainUsefulness(message) {
        const text = message.content.toLowerCase();
        const hits = ["policy", "runtime", "capability", "experience"].filter((term) => text.includes(term)).length;
        return clamp01(hits * 0.2);
    }
}
exports.ConversationMemoryCapture = ConversationMemoryCapture;
