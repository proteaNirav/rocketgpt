"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryReinforcementScoring = void 0;
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function normalizeReasonCodes(codes) {
    return [...new Set(codes)].sort();
}
class MemoryReinforcementScoring {
    evaluate(input) {
        const reasons = [];
        const signals = new Set(input.cognitiveSignalTypes ?? []);
        let delta = 0;
        const success = input.resultStatus === "success";
        const degraded = input.resultStatus === "degraded_success";
        const failed = input.resultStatus === "failed" ||
            input.resultStatus === "invocation_failed" ||
            input.resultStatus === "denied" ||
            input.resultStatus === "blocked" ||
            input.resultStatus === "invalid" ||
            input.resultStatus === "unavailable" ||
            input.resultStatus === "not_found";
        const verificationRejected = input.verificationDecision === "rejected" ||
            input.verificationDecision === "invalid_result" ||
            input.verificationDecision === "inconsistent_result" ||
            input.verificationDecision === "policy_rejected" ||
            input.verificationAdoptable === false;
        if (success && !verificationRejected) {
            delta += 0.12;
            reasons.push("EXECUTION_SUCCESS_VERIFIED");
        }
        if (input.usedInRecall === true && success) {
            delta += 0.06;
            reasons.push("RECALL_USAGE_SUCCESS");
        }
        if (!signals.has("integrity_warning") &&
            !signals.has("drift_detected") &&
            !signals.has("verification_rejected") &&
            success) {
            delta += 0.02;
            reasons.push("NO_ANOMALY_BASELINE");
        }
        if (degraded) {
            delta -= 0.1;
            reasons.push("DEGRADED_EXECUTION");
        }
        if (input.fallbackTriggered === true) {
            delta -= 0.12;
            reasons.push("FALLBACK_TRIGGERED");
        }
        if (verificationRejected) {
            delta -= 0.18;
            reasons.push("VERIFICATION_REJECTED");
        }
        if (signals.has("integrity_warning")) {
            delta -= 0.2;
            reasons.push("INTEGRITY_WARNING");
        }
        if (signals.has("drift_detected")) {
            delta -= 0.2;
            reasons.push("DRIFT_DETECTED");
        }
        if (input.adoptedSuppressed === true) {
            delta -= 0.15;
            reasons.push("ADOPTION_SUPPRESSED");
        }
        if (failed) {
            delta -= 0.15;
            reasons.push("RUNTIME_FAILURE");
        }
        const currentScore = Number.isFinite(input.currentScore) ? input.currentScore : MemoryReinforcementScoring.SCORE_DEFAULT;
        let score = currentScore + delta;
        if (score < MemoryReinforcementScoring.SCORE_MIN) {
            score = MemoryReinforcementScoring.SCORE_MIN;
            reasons.push("SCORE_BOUNDED_MIN");
        }
        else if (score > MemoryReinforcementScoring.SCORE_MAX) {
            score = MemoryReinforcementScoring.SCORE_MAX;
            reasons.push("SCORE_BOUNDED_MAX");
        }
        const timestamp = input.timestamp ?? new Date().toISOString();
        const events = Math.max(0, Math.trunc(input.currentEvents ?? 0)) + 1;
        const trend = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
        const confidence = clamp(0.55 + Math.min(0.4, Math.abs(delta)), 0, 1);
        const state = {
            memoryId: input.memoryId,
            reinforcementScore: Number(score.toFixed(4)),
            reinforcementEvents: events,
            reinforcementReasonCodes: normalizeReasonCodes(reasons),
            lastReinforcedTimestamp: timestamp,
            reinforcementConfidence: Number(confidence.toFixed(4)),
            reinforcementTrend: trend,
        };
        return {
            state,
            delta: Number(delta.toFixed(4)),
        };
    }
}
exports.MemoryReinforcementScoring = MemoryReinforcementScoring;
MemoryReinforcementScoring.SCORE_MIN = 0;
MemoryReinforcementScoring.SCORE_DEFAULT = 1;
MemoryReinforcementScoring.SCORE_MAX = 2.5;
