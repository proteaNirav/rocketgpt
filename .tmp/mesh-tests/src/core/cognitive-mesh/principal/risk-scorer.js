"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
/**
 * RiskScorer returns a bounded baseline score so guardrails can execute
 * consistently while deeper risk modeling is deferred.
 */
class RiskScorer {
    scoreFor(trustClass, normalizedInput = "") {
        const now = new Date().toISOString();
        const map = {
            trusted: 10,
            restricted: 35,
            untrusted: 65,
            quarantined: 90,
            evidence_only: 80,
            blocked: 100,
        };
        const reasons = [`baseline:${trustClass}`];
        let score = map[trustClass];
        if (normalizedInput.length > 6000) {
            score = Math.min(100, score + 15);
            reasons.push("long_input");
        }
        if (/[<>{}]/.test(normalizedInput)) {
            score = Math.min(100, score + 5);
            reasons.push("special_tokens_present");
        }
        return { score, reasons, evaluatedAt: now };
    }
}
exports.RiskScorer = RiskScorer;
