"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionTrail = void 0;
class DecisionTrail {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.decisions = [];
        this.sequence = 0;
    }
    record(input) {
        this.sequence += 1;
        const decision = {
            id: `dec-${this.sessionId}-${this.sequence}`,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            category: input.category,
            decision: input.decision,
            rationale: input.rationale,
            confidence: input.confidence,
            source: input.source,
            metadata: input.metadata ? { ...input.metadata } : undefined,
        };
        this.decisions.push(decision);
        return decision;
    }
    list() {
        return this.decisions.map((decision) => ({
            ...decision,
            metadata: decision.metadata ? { ...decision.metadata } : undefined,
        }));
    }
    clear() {
        this.decisions.length = 0;
    }
    snapshot() {
        return this.list();
    }
}
exports.DecisionTrail = DecisionTrail;
