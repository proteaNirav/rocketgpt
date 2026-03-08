"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplicitRecallEngine = void 0;
const memory_ranking_1 = require("./memory-ranking");
const adopted_recall_foundation_1 = require("./adopted-recall-foundation");
let recallSequence = 0;
class ExplicitRecallEngine {
    constructor(repository) {
        this.repository = repository;
        this.ranking = new memory_ranking_1.MemoryRanking();
        this.adoptedRecall = new adopted_recall_foundation_1.AdoptedRecallFoundation();
    }
    recall(query) {
        const pool = this.repository
            .listMemoryBySession(query.sessionId)
            .filter((item) => (query.layers ? query.layers.includes(item.layer) : true));
        const recallFiltered = this.adoptedRecall.recall({
            sessionId: query.sessionId,
            items: pool,
            query: query.query,
            capabilityId: query.capabilityId,
            maxItems: Math.max(1, query.limit ?? 5) * 2,
        });
        const ranked = this.ranking.rank(recallFiltered.items.map((item) => item.memory), {
            query: query.query,
        });
        const minRelevance = Math.max(0, Math.min(1, query.minRelevance ?? 0.35));
        const limit = Math.max(1, query.limit ?? 5);
        const selected = ranked
            .filter((item) => item.score >= minRelevance)
            .slice(0, limit)
            .map((item) => item.memory);
        recallSequence += 1;
        const recallEvent = {
            recallEventId: `recall-explicit-${query.sessionId}-${recallSequence}`,
            sessionId: query.sessionId,
            mode: "explicit",
            query: query.query,
            selectedMemoryIds: selected.map((item) => item.memoryId),
            thresholdUsed: minRelevance,
            createdAt: new Date().toISOString(),
            advisoryOnly: false,
            metadata: query.capabilityId ? { capabilityId: query.capabilityId } : undefined,
        };
        this.repository.saveRecallEvent(recallEvent);
        return {
            items: selected,
            recallEvent,
        };
    }
}
exports.ExplicitRecallEngine = ExplicitRecallEngine;
