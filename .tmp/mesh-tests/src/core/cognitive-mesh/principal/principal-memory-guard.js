"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrincipalMemoryGuard = void 0;
/**
 * Memory guard isolates low-trust input from durable memory tiers.
 * V1 only enforces coarse policy; semantic policy is deferred.
 */
class PrincipalMemoryGuard {
    async evaluateWrite(event) {
        const denied = event.trustClass === "blocked" ||
            event.trustClass === "quarantined" ||
            event.trustClass === "untrusted" ||
            event.trustClass === "evidence_only";
        return {
            allowed: !denied,
            disposition: denied ? "block" : "allow",
            trustClass: event.trustClass,
            risk: event.risk,
            reasons: denied ? ["memory_write_blocked_by_trust"] : ["memory_write_allowed"],
        };
    }
    async evaluateRecall(event) {
        if (event.trustClass === "blocked") {
            return { disposition: "exclude", reasons: ["blocked_trust_no_recall"] };
        }
        if (event.trustClass === "quarantined") {
            return { disposition: "exclude", reasons: ["quarantined_trust_no_recall"] };
        }
        if (event.trustClass === "evidence_only") {
            return { disposition: "restrict", reasons: ["evidence_only_recall_restricted"] };
        }
        if (event.trustClass === "untrusted") {
            return {
                disposition: "restrict",
                reasons: ["untrusted_recall_restricted"],
            };
        }
        return {
            disposition: "allow",
            reasons: ["default_allow_recall"],
        };
    }
}
exports.PrincipalMemoryGuard = PrincipalMemoryGuard;
