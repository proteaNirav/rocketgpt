"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReasoningContext = void 0;
class ReasoningContext {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.entries = [];
        this.sequence = 0;
    }
    add(input) {
        this.sequence += 1;
        const entry = {
            id: `rcx-${this.sessionId}-${this.sequence}`,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            type: input.type,
            label: input.label,
            value: input.value,
            source: input.source,
            metadata: input.metadata ? { ...input.metadata } : undefined,
        };
        this.entries.push(entry);
        return entry;
    }
    list() {
        return this.entries.map((entry) => ({
            ...entry,
            metadata: entry.metadata ? { ...entry.metadata } : undefined,
        }));
    }
    clear() {
        this.entries.length = 0;
    }
    snapshot() {
        return this.list();
    }
}
exports.ReasoningContext = ReasoningContext;
