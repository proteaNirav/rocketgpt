"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstitutionalEvaluationHook = void 0;
const constitution_loader_1 = require("./constitution-loader");
const DEFAULT_EVAL_VERSION = 1;
const ID_ORDER = [
    "governed_existence",
    "continuity_preservation",
    "reality_alignment",
    "self_awareness",
    "observational_learning",
    "trusted_steward_recognition_and_protection",
];
function uniqueSorted(items) {
    return [...new Set(items)].sort();
}
function inPriorityOrder(input, principles) {
    const ids = new Set(input);
    const ordered = principles.map((item) => item.id).filter((id) => ids.has(id));
    return ordered;
}
function clamp01(value) {
    if (!Number.isFinite(value)) {
        return 0.5;
    }
    return Math.max(0, Math.min(1, value));
}
function toScore(value) {
    return Number(clamp01(value).toFixed(4));
}
function deriveStatus(args) {
    if (args.insufficient && args.alignedCount === 0 && args.stressedCount === 0 && args.violatedCount === 0) {
        return "insufficient_data";
    }
    if (args.violatedCount > 0) {
        return "potential_violation";
    }
    if (args.stressedCount > 0 && args.alignedCount > 0) {
        return "aligned_with_tension";
    }
    if (args.stressedCount > 0) {
        return "tension_detected";
    }
    if (args.alignedCount > 0) {
        return "aligned";
    }
    return "insufficient_data";
}
class ConstitutionalEvaluationHook {
    constructor() {
        this.constitutionCache = null;
        this.constitutionPromise = (0, constitution_loader_1.loadRocketGptConstitutionV1FromYaml)()
            .then((doc) => {
            this.constitutionCache = doc;
            return doc;
        })
            .catch(() => {
            const fallback = {
                version: 1,
                name: "RocketGPT Constitutional Brain Layer",
                status: "defined",
                enforcement_mode: "deferred_phased_rollout",
                principles: ID_ORDER.map((id, index) => ({
                    id,
                    priority: (index + 1),
                    title: id,
                    description: "",
                    constraints: [],
                })),
            };
            this.constitutionCache = fallback;
            return fallback;
        });
    }
    async evaluate(input) {
        const constitution = this.constitutionCache ?? (await this.constitutionPromise);
        const now = new Date().toISOString();
        const signalTypes = uniqueSorted((input.cognitiveSignalTypes ?? []).map((item) => String(item)));
        const aligned = [];
        const stressed = [];
        const violated = [];
        const reasons = [];
        const tags = [];
        const hasRuntimeEvidence = input.resultStatus !== undefined ||
            input.verificationDecision !== undefined ||
            signalTypes.length > 0 ||
            input.runtimeGuardOutcome !== undefined ||
            input.dispatchGuardOutcome !== undefined;
        let score = 0.55;
        if (input.resultStatus === "success" &&
            input.verificationDecision !== "rejected" &&
            input.verificationDecision !== "invalid_result" &&
            input.verificationDecision !== "inconsistent_result" &&
            input.verificationDecision !== "policy_rejected" &&
            !signalTypes.includes("drift_detected") &&
            !signalTypes.includes("integrity_warning")) {
            aligned.push("reality_alignment", "continuity_preservation", "governed_existence");
            reasons.push("VERIFIED_SUCCESS_ALIGNED");
            tags.push("constitution:verified_success_aligned");
            score += 0.24;
        }
        if (input.runtimeGuardOutcome === "deny" ||
            input.runtimeGuardOutcome === "safe_mode_redirect" ||
            input.dispatchGuardOutcome === "deny") {
            aligned.push("governed_existence");
            reasons.push("DENY_PATH_GOVERNANCE_ALIGNED");
            tags.push("constitution:deny_path_governed");
            score += 0.12;
        }
        if (input.resultStatus === "degraded_success" || input.fallbackTriggered === true) {
            stressed.push("continuity_preservation", "reality_alignment");
            reasons.push("DEGRADED_OR_FALLBACK_TENSION");
            tags.push("constitution:degraded_tension");
            score -= 0.14;
        }
        if (input.verificationDecision === "rejected" ||
            input.verificationDecision === "invalid_result" ||
            input.verificationDecision === "inconsistent_result" ||
            input.verificationDecision === "policy_rejected") {
            stressed.push("reality_alignment", "governed_existence");
            reasons.push("VERIFICATION_REJECTION_TENSION");
            tags.push("constitution:verification_tension");
            score -= 0.2;
        }
        if (signalTypes.includes("drift_detected") || signalTypes.includes("integrity_warning")) {
            violated.push("continuity_preservation", "reality_alignment");
            reasons.push("DRIFT_OR_INTEGRITY_VIOLATION_RISK");
            tags.push("constitution:integrity_risk");
            score -= 0.28;
        }
        const anomalyCount = signalTypes.filter((item) => item === "drift_detected" || item === "integrity_warning" || item === "verification_rejected").length;
        if (anomalyCount >= 2) {
            stressed.push("self_awareness", "observational_learning");
            reasons.push("REPEATED_ANOMALY_TENSION");
            tags.push("constitution:repeated_anomaly");
            score -= 0.1;
        }
        if (input.reinforcementAppliedCount && input.reinforcementAppliedCount > 0) {
            aligned.push("observational_learning");
            tags.push("constitution:learning_signal");
            score += 0.04;
        }
        if (input.hasExperienceRecord) {
            aligned.push("self_awareness");
            tags.push("constitution:experience_recorded");
            score += 0.03;
        }
        if (!hasRuntimeEvidence) {
            reasons.push("INSUFFICIENT_RUNTIME_DATA");
            tags.push("constitution:insufficient_data");
            score = 0.5;
        }
        const alignedOrdered = inPriorityOrder(uniqueSorted(aligned), constitution.principles);
        const stressedOrdered = inPriorityOrder(uniqueSorted(stressed), constitution.principles);
        const violatedOrdered = inPriorityOrder(uniqueSorted(violated), constitution.principles);
        const status = deriveStatus({
            alignedCount: alignedOrdered.length,
            stressedCount: stressedOrdered.length,
            violatedCount: violatedOrdered.length,
            insufficient: !hasRuntimeEvidence,
        });
        return {
            evaluationId: `constitution_eval_${input.evaluatedEntityType}_${input.evaluatedEntityId}`,
            constitutionVersion: constitution.version ?? DEFAULT_EVAL_VERSION,
            evaluatedAt: now,
            evaluatedEntityType: input.evaluatedEntityType,
            evaluatedEntityId: input.evaluatedEntityId,
            alignedPrinciples: alignedOrdered,
            stressedPrinciples: stressedOrdered,
            violatedPrinciples: violatedOrdered,
            constitutionalStatus: status,
            constitutionalScore: toScore(score),
            constitutionalReasonCodes: uniqueSorted(reasons),
            constitutionalTags: uniqueSorted(tags),
            metadata: {
                sessionId: input.sessionId,
                executionId: input.executionId,
                resultStatus: input.resultStatus,
                verificationDecision: input.verificationDecision,
                memoryAdoptionDecision: input.memoryAdoptionDecision,
                reinforcementAppliedCount: input.reinforcementAppliedCount ?? 0,
                signalTypes,
            },
        };
    }
}
exports.ConstitutionalEvaluationHook = ConstitutionalEvaluationHook;
