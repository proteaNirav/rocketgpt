"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImplicitResurfacingEngine = void 0;
const memory_ranking_1 = require("./memory-ranking");
const adopted_recall_foundation_1 = require("./adopted-recall-foundation");
let implicitRecallSequence = 0;
class ImplicitResurfacingEngine {
    constructor(repository) {
        this.repository = repository;
        this.ranking = new memory_ranking_1.MemoryRanking();
        this.adoptedRecall = new adopted_recall_foundation_1.AdoptedRecallFoundation();
    }
    resurface(input) {
        const threshold = Math.max(0.45, Math.min(0.95, input.threshold ?? 0.72));
        const limit = Math.max(1, Math.min(6, input.limit ?? 2));
        const pool = this.repository.listMemoryBySession(input.sessionId);
        const recallFiltered = this.adoptedRecall.recall({
            sessionId: input.sessionId,
            items: pool,
            intentHint: input.intentHint,
            routeType: input.routeType,
            riskScore: input.riskScore,
            maxItems: Math.max(1, limit * 2),
        });
        const ranked = this.ranking.rank(recallFiltered.items.map((item) => item.memory), {
            intentHint: input.intentHint,
            routeType: input.routeType,
            riskScore: input.riskScore,
        });
        const selected = ranked.filter((item) => item.score >= threshold).slice(0, limit).map((item) => item.memory);
        implicitRecallSequence += 1;
        const recallEvent = {
            recallEventId: `recall-implicit-${input.sessionId}-${implicitRecallSequence}`,
            sessionId: input.sessionId,
            mode: "implicit",
            query: input.intentHint,
            selectedMemoryIds: selected.map((item) => item.memoryId),
            thresholdUsed: threshold,
            createdAt: new Date().toISOString(),
            advisoryOnly: true,
            metadata: {
                routeType: input.routeType,
                sourceType: input.sourceType,
            },
        };
        this.repository.saveRecallEvent(recallEvent);
        return {
            advisory: true,
            threshold,
            items: selected,
            recallEvent,
        };
    }
}
exports.ImplicitResurfacingEngine = ImplicitResurfacingEngine;
