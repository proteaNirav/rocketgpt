"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeSignalCollector = void 0;
exports.createRuntimeSignal = createRuntimeSignal;
exports.deriveCapabilitySignals = deriveCapabilitySignals;
exports.deriveIntegritySignals = deriveIntegritySignals;
exports.deriveDriftSignals = deriveDriftSignals;
exports.summarizeSignalTypes = summarizeSignalTypes;
const timeline_canonicalizer_1 = require("./timeline-canonicalizer");
const SIGNAL_CATEGORY_BY_TYPE = {
    execution_ok: "execution",
    degraded_execution: "execution",
    verification_warning: "verification",
    verification_rejected: "verification",
    guard_block: "guard",
    dispatch_reroute: "dispatch",
    safe_mode_redirect: "guard",
    integrity_warning: "integrity",
    drift_detected: "drift",
    unavailable_capability: "availability",
    memory_candidate: "memory",
    experience_candidate: "experience",
    adoption_suppressed: "adoption",
};
const SIGNAL_SEVERITY_BY_TYPE = {
    execution_ok: "info",
    degraded_execution: "medium",
    verification_warning: "medium",
    verification_rejected: "high",
    guard_block: "high",
    dispatch_reroute: "medium",
    safe_mode_redirect: "high",
    integrity_warning: "high",
    drift_detected: "high",
    unavailable_capability: "medium",
    memory_candidate: "low",
    experience_candidate: "low",
    adoption_suppressed: "high",
};
function normalizeReasonCodes(reasonCodes) {
    if (!reasonCodes || reasonCodes.length === 0) {
        return [];
    }
    return [...new Set(reasonCodes.filter((code) => typeof code === "string" && code.trim().length > 0))].sort();
}
function clampPriority(value) {
    if (!Number.isFinite(value)) {
        return 50;
    }
    const normalized = Math.round(value);
    if (normalized < 1) {
        return 1;
    }
    if (normalized > 100) {
        return 100;
    }
    return normalized;
}
function defaultPriorityForSeverity(severity) {
    switch (severity) {
        case "critical":
            return 95;
        case "high":
            return 85;
        case "medium":
            return 65;
        case "low":
            return 45;
        default:
            return 25;
    }
}
function createRuntimeSignal(input) {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const reasonCodes = normalizeReasonCodes(input.reasonCodes);
    const severity = input.severity;
    const stableIdentity = (0, timeline_canonicalizer_1.hashCanonicalJson)({
        signalType: input.signalType,
        category: input.category,
        source: input.source,
        ids: input.ids ?? {},
        capabilityId: input.capabilityId,
        routeType: input.routeType,
        reasonCodes,
        metadata: input.metadata ?? {},
    });
    const streamAnchor = input.ids?.executionId?.trim() ||
        input.ids?.requestId?.trim() ||
        input.ids?.correlationId?.trim() ||
        input.ids?.sessionId?.trim() ||
        "global";
    const signalId = `csg_${(0, timeline_canonicalizer_1.hashCanonicalJson)(`${streamAnchor}:${input.signalType}:${stableIdentity}`).slice(0, 24)}`;
    return {
        schemaVersion: "rgpt.cognitive_signal.v1",
        signalId,
        stableIdentity,
        signalType: input.signalType,
        category: input.category,
        source: input.source,
        severity,
        priority: clampPriority(input.priority ?? defaultPriorityForSeverity(severity)),
        timestamp,
        ids: {
            requestId: input.ids?.requestId,
            executionId: input.ids?.executionId,
            correlationId: input.ids?.correlationId,
            sessionId: input.ids?.sessionId,
        },
        capabilityId: input.capabilityId,
        routeType: input.routeType,
        reasonCodes,
        confidence: input.confidence,
        weight: input.weight,
        metadata: input.metadata ? { ...input.metadata } : undefined,
    };
}
function createDefaultSignal(input) {
    return createRuntimeSignal({
        ...input,
        category: SIGNAL_CATEGORY_BY_TYPE[input.signalType],
        severity: SIGNAL_SEVERITY_BY_TYPE[input.signalType],
    });
}
class RuntimeSignalCollector {
    constructor() {
        this.byId = new Map();
        this.order = [];
    }
    add(signal) {
        if (this.byId.has(signal.signalId)) {
            return;
        }
        this.byId.set(signal.signalId, signal);
        this.order.push(signal.signalId);
    }
    addMany(signals) {
        for (const signal of signals) {
            this.add(signal);
        }
    }
    list() {
        return this.order.map((id) => {
            const signal = this.byId.get(id);
            return {
                ...signal,
                ids: { ...signal.ids },
                reasonCodes: [...signal.reasonCodes],
                metadata: signal.metadata ? { ...signal.metadata } : undefined,
            };
        });
    }
}
exports.RuntimeSignalCollector = RuntimeSignalCollector;
function deriveCapabilitySignals(input) {
    const out = [];
    const collector = new RuntimeSignalCollector();
    const add = (signalType, extras) => {
        collector.add(createDefaultSignal({
            signalType,
            source: input.source,
            ids: input.ids,
            timestamp: input.timestamp,
            capabilityId: input.capabilityId,
            routeType: input.routeType,
            confidence: input.confidence,
            ...extras,
        }));
    };
    if (input.capabilityStatus === "success") {
        add("execution_ok");
    }
    if (input.capabilityStatus === "degraded_success" || input.runtimeGuardOutcome === "degraded_allow") {
        add("degraded_execution");
    }
    if (input.runtimeGuardOutcome === "deny") {
        add("guard_block", { reasonCodes: ["runtime_guard_deny"] });
    }
    if (input.runtimeGuardOutcome === "safe_mode_redirect") {
        add("safe_mode_redirect", { reasonCodes: ["runtime_guard_safe_mode_redirect"] });
        add("guard_block", { reasonCodes: ["runtime_guard_safe_mode_redirect"] });
    }
    if (input.dispatchGuardOutcome === "reroute") {
        add("dispatch_reroute", { reasonCodes: ["dispatch_guard_reroute"] });
    }
    if (input.dispatchGuardOutcome === "deny") {
        add("guard_block", { reasonCodes: ["dispatch_guard_deny"] });
    }
    if (input.dispatchGuardOutcome === "safe_mode_redirect") {
        add("safe_mode_redirect", { reasonCodes: ["dispatch_guard_safe_mode_redirect"] });
    }
    if (input.capabilityStatus === "not_found" || input.capabilityStatus === "unavailable") {
        add("unavailable_capability");
    }
    if (input.capabilityVerification) {
        const verification = input.capabilityVerification;
        if (verification.decision === "accepted_with_warnings") {
            add("verification_warning", {
                reasonCodes: verification.reasonCodes,
                metadata: { warnings: [...verification.warnings] },
            });
        }
        if (verification.decision === "rejected" ||
            verification.decision === "invalid_result" ||
            verification.decision === "inconsistent_result" ||
            verification.decision === "policy_rejected") {
            add("verification_rejected", {
                reasonCodes: verification.reasonCodes,
                metadata: { verificationDecision: verification.decision },
            });
        }
        if (!verification.adoptable && (input.capabilityStatus === "success" || input.capabilityStatus === "degraded_success")) {
            add("adoption_suppressed", {
                reasonCodes: verification.reasonCodes,
                metadata: { verificationDecision: verification.decision },
            });
        }
    }
    if (input.fallbackTriggered) {
        add("adoption_suppressed", {
            reasonCodes: ["fallback_triggered"],
            metadata: { fallbackTriggered: true },
        });
    }
    if (input.shouldCommit) {
        add("memory_candidate");
    }
    if (input.capabilityStatus !== "none") {
        add("experience_candidate", {
            reasonCodes: input.governanceIssues ? [...input.governanceIssues] : [],
            metadata: { verificationRequired: input.verificationRequired === true },
        });
    }
    out.push(...collector.list());
    return out;
}
function deriveIntegritySignals(integrity, ids, source = "ledger_integrity_verifier") {
    if (integrity.summary.status === "valid") {
        return [];
    }
    return [
        createDefaultSignal({
            signalType: "integrity_warning",
            source,
            ids,
            reasonCodes: integrity.findings.slice(0, 10).map((finding) => finding.code),
            metadata: {
                status: integrity.summary.status,
                errors: integrity.summary.errorCount,
                warnings: integrity.summary.warningCount,
                partial: integrity.summary.partial,
            },
        }),
    ];
}
function deriveDriftSignals(drift, ids, source = "side_effect_drift_detector") {
    if (drift.summary.status === "no_drift") {
        return [];
    }
    return [
        createDefaultSignal({
            signalType: "drift_detected",
            source,
            ids,
            reasonCodes: drift.findings.slice(0, 10).map((finding) => finding.code),
            metadata: {
                status: drift.summary.status,
                driftFindingCount: drift.summary.driftFindingCount,
                warningCount: drift.summary.warningCount,
                integrityStatus: drift.summary.integrityStatus,
            },
        }),
    ];
}
function summarizeSignalTypes(signals) {
    return [...new Set(signals.map((signal) => signal.signalType))];
}
