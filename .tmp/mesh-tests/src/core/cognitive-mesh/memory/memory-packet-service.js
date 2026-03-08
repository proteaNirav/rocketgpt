"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPacketService = void 0;
const memory_ranking_1 = require("./memory-ranking");
const adopted_recall_foundation_1 = require("./adopted-recall-foundation");
let packetSequence = 0;
class MemoryPacketService {
    constructor(repository) {
        this.repository = repository;
        this.ranking = new memory_ranking_1.MemoryRanking();
        this.adoptedRecall = new adopted_recall_foundation_1.AdoptedRecallFoundation();
    }
    buildPacket(context, options = {}) {
        const allowInjection = context.entitlement?.allowInjection ?? true;
        const limit = Math.max(1, Math.min(5, options.limit ?? 3));
        const relevanceFloor = Math.max(0.4, Math.min(0.95, options.relevanceFloor ?? 0.62));
        let memoryItems = [];
        if (allowInjection) {
            const recall = this.adoptedRecall.recall({
                sessionId: context.sessionId,
                items: this.repository.listMemoryBySession(context.sessionId),
                query: options.query ?? context.purpose,
                capabilityId: context.capabilityId,
                maxItems: Math.max(6, limit * 4),
            });
            memoryItems = this.ranking.rank(recall.items.map((item) => item.memory), {
                query: options.query ?? context.purpose,
            });
        }
        const selected = allowInjection
            ? memoryItems
                .filter((item) => item.score >= relevanceFloor)
                .slice(0, limit)
                .map((item) => this.toBoundedPacketMemory(item.memory, item.score))
            : [];
        packetSequence += 1;
        return {
            packetId: `packet-${context.sessionId}-${packetSequence}`,
            sessionId: context.sessionId,
            capabilityId: context.capabilityId,
            purpose: context.purpose,
            memoryItems: selected,
            relevanceFloor,
            generatedAt: new Date().toISOString(),
            provenance: {
                recallReason: allowInjection ? "ranked_packet_selection:quality_filtered" : `injection_blocked:${context.entitlement?.reason ?? "entitlement_denied"}`,
                explicit: true,
                query: options.query ?? context.purpose,
            },
        };
    }
    toBoundedPacketMemory(memory, score) {
        const maxContentLength = 220;
        const content = memory.content.length <= maxContentLength ? memory.content : `${memory.content.slice(0, 217)}...`;
        return {
            ...memory,
            content,
            tags: memory.tags.map((tag) => ({ ...tag })),
            links: memory.links.map((link) => ({ ...link })),
            provenance: { ...memory.provenance },
            scores: {
                ...memory.scores,
                relevance: Math.max(memory.scores.relevance, Math.min(1, score)),
            },
            metadata: {
                ...(memory.metadata ? { ...memory.metadata } : {}),
                packetBounded: true,
                selectionScore: score,
            },
        };
    }
}
exports.MemoryPacketService = MemoryPacketService;
