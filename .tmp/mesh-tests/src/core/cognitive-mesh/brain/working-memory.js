"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingMemory = void 0;
class WorkingMemory {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.entries = new Map();
    }
    set(key, value, options = {}) {
        const entry = {
            key,
            value,
            updatedAt: new Date().toISOString(),
            source: options.source,
            metadata: options.metadata ? { ...options.metadata } : undefined,
        };
        this.entries.set(key, entry);
        return entry;
    }
    get(key) {
        return this.entries.get(key)?.value;
    }
    has(key) {
        return this.entries.has(key);
    }
    delete(key) {
        return this.entries.delete(key);
    }
    clear() {
        this.entries.clear();
    }
    list() {
        return [...this.entries.values()].map((entry) => ({
            ...entry,
            metadata: entry.metadata ? { ...entry.metadata } : undefined,
        }));
    }
    snapshot() {
        const snapshot = {};
        for (const [key, entry] of this.entries.entries()) {
            snapshot[key] = {
                ...entry,
                metadata: entry.metadata ? { ...entry.metadata } : undefined,
            };
        }
        return snapshot;
    }
    getSessionId() {
        return this.sessionId;
    }
}
exports.WorkingMemory = WorkingMemory;
