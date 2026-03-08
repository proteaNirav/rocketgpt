"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrincipalLearningGuard = void 0;
/**
 * Learning guard protects long-term intelligence from unsafe ingestion.
 * Real autonomous learning remains out of scope for this foundation task.
 */
class PrincipalLearningGuard {
    async evaluate(event) {
        const disposition = this.resolveDisposition(event);
        return {
            disposition,
            reasons: [`learning_disposition:${disposition}`],
        };
    }
    resolveDisposition(event) {
        if (event.trustClass === "blocked" || event.trustClass === "quarantined") {
            return "reject";
        }
        if (event.trustClass === "untrusted") {
            return "archive";
        }
        if (event.trustClass === "restricted") {
            return "retain";
        }
        return "promote";
    }
}
exports.PrincipalLearningGuard = PrincipalLearningGuard;
