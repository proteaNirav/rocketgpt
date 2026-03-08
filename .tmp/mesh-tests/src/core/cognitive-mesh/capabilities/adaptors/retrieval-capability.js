"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalCapability = void 0;
const constants_1 = require("../constants");
const RETRIEVAL_CAPABILITY = {
    capabilityId: constants_1.CAPABILITY_IDS.RETRIEVAL,
    name: "Retrieval Capability",
    family: "knowledge",
    version: "1.0.0",
    status: "active",
    description: "Controlled retrieval over in-memory records for session/runtime lookups.",
    ownerAuthority: "consortium",
    allowedOperations: [constants_1.CAPABILITY_OPERATIONS.RETRIEVAL_LOOKUP],
    verificationMode: "required",
    riskLevel: "medium",
    directBrainCommitAllowed: false,
    monitoringProfile: "high_scrutiny",
};
function extractQuery(input) {
    if (typeof input === "string") {
        return input.trim().toLowerCase();
    }
    if (input && typeof input === "object" && "query" in input) {
        const query = input.query;
        return typeof query === "string" ? query.trim().toLowerCase() : "";
    }
    return "";
}
class RetrievalCapability {
    constructor(records = []) {
        this.records = records;
    }
    getCapabilityDefinition() {
        return { ...RETRIEVAL_CAPABILITY, allowedOperations: [...RETRIEVAL_CAPABILITY.allowedOperations] };
    }
    async invoke(request) {
        const query = extractQuery(request.input);
        const memoryHints = Array.isArray(request.trace?.memoryPacketHints)
            ? (request.trace?.memoryPacketHints).filter((hint) => typeof hint === "string")
            : [];
        const matches = query.length === 0
            ? this.records.slice(0, 5)
            : this.records.filter((record) => record.text.toLowerCase().includes(query)).slice(0, 5);
        return {
            requestId: request.requestId,
            sessionId: request.sessionId,
            capabilityId: request.capabilityId,
            status: "success",
            payload: {
                query,
                count: matches.length,
                memoryContextApplied: memoryHints.length > 0,
                memoryHintCount: memoryHints.length,
                records: matches.map((record) => ({
                    id: record.id,
                    text: record.text,
                    metadata: record.metadata ? { ...record.metadata } : undefined,
                })),
            },
            confidence: matches.length > 0 ? 0.82 : 0.55,
            verificationRequired: true,
            trace: {
                operation: constants_1.CAPABILITY_OPERATIONS.RETRIEVAL_LOOKUP,
            },
            completedAt: new Date().toISOString(),
        };
    }
}
exports.RetrievalCapability = RetrievalCapability;
