"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
/**
 * WorkingMemory keeps short-lived, session-scoped memory in process memory.
 * No cross-session writes are allowed in this default implementation.
 */
class WorkingMemory {
    constructor(options) {
        this.bySession = new Map();
        this.ttlMs = options?.ttlMs ?? 15 * 60 * 1000;
        this.maxItemsPerSession = options?.maxItemsPerSession ?? 40;
    }
    async put(record) {
        const current = this.pruneExpired(this.bySession.get(record.sessionId) ?? []);
        current.push(record);
        const bounded = current.slice(-this.maxItemsPerSession);
        this.bySession.set(record.sessionId, bounded);
    }
    async get(query) {
        const current = this.pruneExpired(this.bySession.get(query.sessionId) ?? []);
        this.bySession.set(query.sessionId, current);
        return this.filter(current, query);
    }
    filter(records, query) {
        return records
            .filter((r) => query.requestId ? String(r.metadata?.requestId ?? "") === query.requestId : true)
            .filter((r) => (query.tier ? r.tier === query.tier : true))
            .filter((r) => (query.minConfidence !== undefined ? r.confidence >= query.minConfidence : true))
            .slice(0, query.limit ?? 20);
    }
    pruneExpired(records) {
        const now = Date.now();
        return records.filter((record) => {
            const createdAtMs = Date.parse(record.createdAt);
            if (Number.isNaN(createdAtMs)) {
                return true;
            }
            return now - createdAtMs <= this.ttlMs;
        });
    }
}
exports.WorkingMemory = WorkingMemory;
