"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashCanonicalJson = hashCanonicalJson;
exports.buildCanonicalStableIdentityMaterial = buildCanonicalStableIdentityMaterial;
exports.computeCanonicalStableIdentity = computeCanonicalStableIdentity;
exports.resolveCanonicalExecutionId = resolveCanonicalExecutionId;
exports.canonicalizeExecutionLedgerEntry = canonicalizeExecutionLedgerEntry;
const node_crypto_1 = require("node:crypto");
function sha256(text) {
    return (0, node_crypto_1.createHash)("sha256").update(text).digest("hex");
}
function stableSort(value) {
    if (Array.isArray(value)) {
        return value.map((item) => stableSort(item));
    }
    if (!value || typeof value !== "object") {
        return value;
    }
    const record = value;
    const out = {};
    for (const key of Object.keys(record).sort()) {
        out[key] = stableSort(record[key]);
    }
    return out;
}
function stableJson(value) {
    return JSON.stringify(stableSort(value));
}
function hashCanonicalJson(value) {
    return sha256(stableJson(value));
}
function buildCanonicalStableIdentityMaterial(entry) {
    return {
        executionId: resolveCanonicalExecutionId(entry),
        eventType: mapEventType(entry.eventType),
        stage: mapStage(entry.eventType),
        category: entry.category,
        action: entry.action,
        source: entry.source,
        target: entry.target,
        mode: entry.mode,
        status: entry.status,
        correlation: entry.ids,
        guard: entry.guard
            ? {
                runtimeOutcome: entry.guard.runtime?.outcome,
                runtimeReasonCodes: entry.guard.runtime?.reasons.map((reason) => reason.code),
                dispatchOutcome: entry.guard.dispatch?.outcome,
                dispatchReasonCodes: entry.guard.dispatch?.reasons.map((reason) => reason.code),
                dispatchRerouteTarget: entry.guard.dispatch?.reroute?.target,
            }
            : undefined,
        sideEffect: entry.sideEffect,
    };
}
function computeCanonicalStableIdentity(entry) {
    return hashCanonicalJson(buildCanonicalStableIdentityMaterial(entry));
}
function mapEventType(eventType) {
    switch (eventType) {
        case "dispatch.guard.evaluated":
            return "DISPATCH_GUARD_EVALUATED";
        case "dispatch.started":
            return "DISPATCH_STARTED";
        case "dispatch.completed":
            return "DISPATCH_COMPLETED";
        case "dispatch.denied":
            return "DISPATCH_DENIED";
        case "runtime.guard.evaluated":
            return "RUNTIME_GUARD_TRIGGERED";
        case "execution.started":
            return "EXECUTION_STARTED";
        case "execution.completed":
            return "EXECUTION_COMPLETED";
        case "execution.failed":
            return "EXECUTION_FAILED";
        case "execution.denied":
            return "EXECUTION_DENIED";
        case "execution.redirected":
            return "EXECUTION_REDIRECTED";
        case "execution.degraded":
            return "EXECUTION_DEGRADED";
        case "execution.audit_required":
            return "EXECUTION_AUDIT_REQUIRED";
        case "side_effect.intent":
            return "SIDE_EFFECT_INTENT";
        default:
            return "SIDE_EFFECT_COMPLETED";
    }
}
function mapLayer(category) {
    if (category === "dispatch") {
        return 2;
    }
    if (category === "side_effect") {
        return 3;
    }
    if (category === "runtime") {
        return 5;
    }
    return 6;
}
function mapStage(eventType) {
    switch (eventType) {
        case "dispatch.guard.evaluated":
            return "dispatch_evaluated";
        case "dispatch.started":
            return "dispatch_started";
        case "dispatch.completed":
            return "dispatch_completed";
        case "dispatch.denied":
            return "dispatch_denied";
        case "runtime.guard.evaluated":
            return "runtime_evaluated";
        case "execution.started":
            return "execution_started";
        case "execution.completed":
            return "execution_completed";
        case "execution.failed":
            return "execution_failed";
        case "execution.denied":
            return "execution_denied";
        case "execution.redirected":
            return "execution_redirected";
        case "execution.degraded":
            return "execution_degraded";
        case "execution.audit_required":
            return "execution_audit_required";
        case "side_effect.intent":
            return "side_effect_intent";
        default:
            return "side_effect_completed";
    }
}
function mapStatus(status) {
    switch (status) {
        case "denied":
            return "blocked";
        case "failed":
            return "error";
        case "redirected":
            return "aborted";
        case "degraded":
        case "audit_required":
        case "intent":
            return "partial";
        default:
            return "ok";
    }
}
function classifyActorType(entry) {
    if (entry.category === "runtime" || entry.eventType.includes("guard")) {
        return "guard";
    }
    if (entry.source.includes("orchestrator")) {
        return "orchestrator";
    }
    if (entry.source.includes("provider")) {
        return "provider";
    }
    if (entry.source.includes("cat")) {
        return "cat";
    }
    return "system";
}
function resolveCanonicalExecutionId(entry) {
    const executionId = entry.ids.executionId?.trim();
    if (executionId && executionId.length > 0) {
        return executionId;
    }
    const requestId = entry.ids.requestId?.trim();
    if (requestId && requestId.length > 0) {
        return `req_${requestId}`;
    }
    const sessionId = entry.ids.sessionId?.trim();
    if (sessionId && sessionId.length > 0) {
        return `sess_${sessionId}`;
    }
    return `entry_${entry.entryId}`;
}
function canonicalizeExecutionLedgerEntry(entry, options) {
    const executionId = resolveCanonicalExecutionId(entry);
    const stage = mapStage(entry.eventType);
    const eventType = mapEventType(entry.eventType);
    const stableIdentity = computeCanonicalStableIdentity(entry);
    const eventId = `tle_${sha256(`${executionId}:${options.sequenceNo}:${stableIdentity}`).slice(0, 24)}`;
    const authorityHash = sha256(`${executionId}:${entry.source}:${entry.target}`).slice(0, 32);
    const baseEvent = {
        schemaVersion: "rgpt.timeline_event.canonical.v1",
        executionId,
        eventId,
        stableIdentity,
        sequenceNo: options.sequenceNo,
        timestamp: entry.timestamp,
        eventType,
        category: entry.category,
        layer: mapLayer(entry.category),
        stage,
        action: entry.action,
        source: entry.source,
        target: entry.target,
        actorType: classifyActorType(entry),
        mode: entry.mode,
        status: mapStatus(entry.status),
        outcome: entry.status,
        correlation: {
            requestId: entry.ids.requestId,
            executionId: entry.ids.executionId,
            correlationId: entry.ids.correlationId,
            sessionId: entry.ids.sessionId,
        },
        authority: {
            authContextHash: authorityHash,
            policyProfile: "cognitive_mesh_runtime",
        },
        guards: entry.guard
            ? {
                runtimeOutcome: entry.guard.runtime?.outcome,
                runtimeReasonCodes: entry.guard.runtime?.reasons.map((reason) => reason.code),
                dispatchOutcome: entry.guard.dispatch?.outcome,
                dispatchReasonCodes: entry.guard.dispatch?.reasons.map((reason) => reason.code),
                dispatchRerouteTarget: entry.guard.dispatch?.reroute?.target,
            }
            : undefined,
        sideEffect: entry.sideEffect
            ? {
                intent: entry.sideEffect.intent,
                completed: entry.sideEffect.completed,
                hints: entry.sideEffect.hints ? [...entry.sideEffect.hints] : undefined,
            }
            : undefined,
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
    };
    const eventHash = sha256(stableJson({ ...baseEvent, prevEventHash: options.prevEventHash }));
    return {
        ...baseEvent,
        integrity: {
            eventHash,
            prevEventHash: options.prevEventHash,
        },
    };
}
