"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationCapability = void 0;
const constants_1 = require("../constants");
const VERIFICATION_CAPABILITY = {
    capabilityId: constants_1.CAPABILITY_IDS.VERIFICATION,
    name: "Verification Capability",
    family: "assurance",
    version: "1.0.0",
    status: "active",
    description: "Learner handoff contract baseline for capability result verification.",
    ownerAuthority: "consortium",
    allowedOperations: [constants_1.CAPABILITY_OPERATIONS.VERIFICATION_VALIDATE],
    verificationMode: "none",
    riskLevel: "low",
    directBrainCommitAllowed: true,
    monitoringProfile: "assurance",
};
function normalizeConfidence(value) {
    if (!Number.isFinite(value)) {
        return 0.5;
    }
    const normalized = value;
    return Math.max(0, Math.min(1, normalized));
}
function decideVerdict(confidence, hasErrors) {
    if (hasErrors) {
        return "reject";
    }
    if (confidence >= 0.8) {
        return "accept";
    }
    if (confidence >= 0.55) {
        return "review";
    }
    return "escalate";
}
class VerificationCapability {
    getCapabilityDefinition() {
        return { ...VERIFICATION_CAPABILITY, allowedOperations: [...VERIFICATION_CAPABILITY.allowedOperations] };
    }
    async invoke(request) {
        const payload = request.input;
        const verification = this.verify(payload);
        return {
            requestId: request.requestId,
            sessionId: request.sessionId,
            capabilityId: request.capabilityId,
            status: "success",
            payload: verification,
            confidence: verification.confidence,
            verificationRequired: false,
            trace: {
                operation: constants_1.CAPABILITY_OPERATIONS.VERIFICATION_VALIDATE,
            },
            completedAt: new Date().toISOString(),
        };
    }
    verify(request) {
        const confidence = normalizeConfidence(request.capabilityResult.confidence);
        const hasErrors = (request.capabilityResult.errors?.length ?? 0) > 0;
        const verdict = decideVerdict(confidence, hasErrors);
        const memoryPacketSeen = Boolean(request.trace && "memoryPacketId" in request.trace);
        return {
            verificationRequestId: request.verificationRequestId,
            sessionId: request.sessionId,
            capabilityId: request.capabilityId,
            verdict,
            confidence,
            notes: hasErrors
                ? ["capability_result_contains_errors"]
                : memoryPacketSeen
                    ? ["verification_completed", "memory_context_observed"]
                    : ["verification_completed"],
            recommendedAction: verdict,
            completedAt: new Date().toISOString(),
            trace: request.trace ? { ...request.trace } : undefined,
        };
    }
}
exports.VerificationCapability = VerificationCapability;
