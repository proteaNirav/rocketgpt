"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageCapability = void 0;
const constants_1 = require("../constants");
const LANGUAGE_CAPABILITY = {
    capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
    name: "Language Capability",
    family: "knowledge",
    version: "1.0.0",
    status: "active",
    description: "Deterministic text normalization/structuring/summarization helper.",
    ownerAuthority: "consortium",
    allowedOperations: [
        constants_1.CAPABILITY_OPERATIONS.LANGUAGE_NORMALIZE,
        constants_1.CAPABILITY_OPERATIONS.LANGUAGE_SUMMARIZE,
        constants_1.CAPABILITY_OPERATIONS.LANGUAGE_STRUCTURE,
    ],
    verificationMode: "none",
    riskLevel: "low",
    directBrainCommitAllowed: true,
    monitoringProfile: "standard",
};
function asText(input) {
    if (typeof input === "string") {
        return input;
    }
    if (input == null) {
        return "";
    }
    return JSON.stringify(input);
}
class LanguageCapability {
    getCapabilityDefinition() {
        return { ...LANGUAGE_CAPABILITY, allowedOperations: [...LANGUAGE_CAPABILITY.allowedOperations] };
    }
    async invoke(request) {
        const text = asText(request.input).trim();
        const memoryHints = Array.isArray(request.trace?.memoryPacketHints)
            ? (request.trace?.memoryPacketHints).filter((hint) => typeof hint === "string")
            : [];
        const normalized = text.replace(/\s+/g, " ").trim();
        const summary = normalized.length <= 140 ? normalized : `${normalized.slice(0, 137).trimEnd()}...`;
        const memoryContextApplied = memoryHints.length > 0;
        return {
            requestId: request.requestId,
            sessionId: request.sessionId,
            capabilityId: request.capabilityId,
            status: "success",
            payload: {
                normalizedText: normalized,
                summaryText: summary,
                length: normalized.length,
                memoryContextApplied,
                memoryHintCount: memoryHints.length,
                memoryHints: memoryHints.slice(0, 2),
            },
            confidence: normalized.length > 0 ? 0.88 : 0.6,
            verificationRequired: false,
            trace: {
                operation: constants_1.CAPABILITY_OPERATIONS.LANGUAGE_NORMALIZE,
            },
            completedAt: new Date().toISOString(),
        };
    }
}
exports.LanguageCapability = LanguageCapability;
