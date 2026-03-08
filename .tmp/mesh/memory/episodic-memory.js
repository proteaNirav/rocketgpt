"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpisodicMemory = void 0;
/**
 * EpisodicMemory is a placeholder for event-sequence memory storage.
 * V1 uses in-memory/session-local buffering only.
 */
class EpisodicMemory {
    constructor() {
        this.bySession = new Map();
    }
    async put(record) {
        const items = this.bySession.get(record.sessionId) ?? [];
        items.push(record);
        this.bySession.set(record.sessionId, items);
    }
    async get(query) {
        const items = this.bySession.get(query.sessionId) ?? [];
        return items
            .filter((item) => (query.tier ? item.tier === query.tier : true))
            .slice(0, query.limit ?? 20);
    }
}
exports.EpisodicMemory = EpisodicMemory;
