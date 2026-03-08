"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuralIndexer = void 0;
/**
 * StructuralIndexer builds low-cost lexical/shape metadata only.
 * Vector embeddings and semantic indexing are intentionally deferred.
 */
class StructuralIndexer {
    build(event) {
        const payload = {
            source: event.source,
            trustClass: event.trustClass,
            tokenEstimate: this.estimateTokens(event.normalizedInput),
            inputLength: event.normalizedInput.length,
            tags: event.tags ?? [],
        };
        return {
            id: `idx_${event.eventId}`,
            eventId: event.eventId,
            sessionId: event.sessionId,
            indexType: "structural",
            payload,
            createdAt: new Date().toISOString(),
        };
    }
    estimateTokens(text) {
        if (!text) {
            return 0;
        }
        return Math.ceil(text.length / 4);
    }
}
exports.StructuralIndexer = StructuralIndexer;
