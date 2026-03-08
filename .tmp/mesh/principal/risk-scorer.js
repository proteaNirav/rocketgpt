"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
/**
 * RiskScorer returns a bounded baseline score so guardrails can execute
 * consistently while deeper risk modeling is deferred.
 */
class RiskScorer {
    scoreFor(trustClass) {
        const now = new Date().toISOString();
        const map = {
            trusted: 10,
            restricted: 35,
            untrusted: 65,
            quarantined: 90,
            evidence_only: 80,
            blocked: 100,
        };
        return {
            score: map[trustClass],
            reasons: [`baseline:${trustClass}`],
            evaluatedAt: now,
        };
    }
}
exports.RiskScorer = RiskScorer;
