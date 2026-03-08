"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
/**
 * WorkingMemory keeps short-lived, session-scoped memory in process memory.
 * No cross-session writes are allowed in this default implementation.
 */
class WorkingMemory {
    constructor() {
        this.bySession = new Map();
    }
    async put(record) {
        const current = this.bySession.get(record.sessionId) ?? [];
        current.push(record);
        this.bySession.set(record.sessionId, current);
    }
    async get(query) {
        const current = this.bySession.get(query.sessionId) ?? [];
        return this.filter(current, query);
    }
    filter(records, query) {
        return records
            .filter((r) => (query.tier ? r.tier === query.tier : true))
            .filter((r) => (query.minConfidence !== undefined ? r.confidence >= query.minConfidence : true))
            .slice(0, query.limit ?? 20);
    }
}
exports.WorkingMemory = WorkingMemory;
