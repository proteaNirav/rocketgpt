"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionLedger = void 0;
exports.getExecutionLedger = getExecutionLedger;
exports.resetExecutionLedgerForTests = resetExecutionLedgerForTests;
exports.verifyRuntimeTimelineJsonlIntegrity = verifyRuntimeTimelineJsonlIntegrity;
exports.detectRuntimeTimelineSideEffectDrift = detectRuntimeTimelineSideEffectDrift;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const timeline_canonicalizer_1 = require("./timeline-canonicalizer");
const ledger_integrity_verifier_1 = require("./ledger-integrity-verifier");
const side_effect_drift_detector_1 = require("./side-effect-drift-detector");
const cognitive_signal_system_1 = require("./cognitive-signal-system");
function defaultLedgerPath() {
    return process.env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl";
}
function defaultTimelinePath() {
    return process.env.COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
}
function toText(value, fallback) {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}
class ExecutionLedger {
    constructor(durableJsonlPath = defaultLedgerPath(), durableTimelineJsonlPath = defaultTimelinePath()) {
        this.durableJsonlPath = durableJsonlPath;
        this.durableTimelineJsonlPath = durableTimelineJsonlPath;
        this.entries = [];
        this.timelineEvents = [];
        this.timelineSequenceByExecutionId = new Map();
        this.timelinePrevHashByExecutionId = new Map();
        this.sequence = 0;
        this.durablePathReady = false;
        this.durableTimelinePathReady = false;
    }
    append(input) {
        const entry = {
            entryId: `exec_${++this.sequence}`,
            timestamp: input.timestamp ?? new Date().toISOString(),
            category: input.category,
            eventType: input.eventType,
            action: toText(input.action, "unknown_action"),
            source: toText(input.source, "unknown_source"),
            target: toText(input.target, "unknown_target"),
            ids: {
                requestId: input.ids?.requestId,
                executionId: input.ids?.executionId,
                correlationId: input.ids?.correlationId,
                sessionId: input.ids?.sessionId,
            },
            mode: input.mode ?? "unknown",
            status: input.status,
            guard: input.guard
                ? {
                    runtime: input.guard.runtime
                        ? { outcome: input.guard.runtime.outcome, reasons: [...input.guard.runtime.reasons] }
                        : undefined,
                    dispatch: input.guard.dispatch
                        ? {
                            outcome: input.guard.dispatch.outcome,
                            reasons: [...input.guard.dispatch.reasons],
                            reroute: input.guard.dispatch.reroute ? { ...input.guard.dispatch.reroute } : undefined,
                        }
                        : undefined,
                }
                : undefined,
            sideEffect: input.sideEffect
                ? {
                    intent: input.sideEffect.intent,
                    completed: input.sideEffect.completed,
                    hints: input.sideEffect.hints ? [...input.sideEffect.hints] : undefined,
                }
                : undefined,
            metadata: input.metadata ? { ...input.metadata } : undefined,
        };
        this.entries.push(entry);
        void this.persist(entry);
        const canonicalExecutionId = (0, timeline_canonicalizer_1.resolveCanonicalExecutionId)(entry);
        const sequenceNo = (this.timelineSequenceByExecutionId.get(canonicalExecutionId) ?? 0) + 1;
        this.timelineSequenceByExecutionId.set(canonicalExecutionId, sequenceNo);
        const prevEventHash = this.timelinePrevHashByExecutionId.get(canonicalExecutionId) ?? null;
        const timelineEvent = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(entry, {
            sequenceNo,
            prevEventHash,
        });
        this.timelinePrevHashByExecutionId.set(canonicalExecutionId, timelineEvent.integrity.eventHash);
        this.timelineEvents.push(timelineEvent);
        void this.persistTimelineEvent(timelineEvent);
        return entry;
    }
    snapshot() {
        return this.entries.map((entry) => ({
            ...entry,
            ids: { ...entry.ids },
            guard: entry.guard
                ? {
                    runtime: entry.guard.runtime
                        ? { outcome: entry.guard.runtime.outcome, reasons: [...entry.guard.runtime.reasons] }
                        : undefined,
                    dispatch: entry.guard.dispatch
                        ? {
                            outcome: entry.guard.dispatch.outcome,
                            reasons: [...entry.guard.dispatch.reasons],
                            reroute: entry.guard.dispatch.reroute ? { ...entry.guard.dispatch.reroute } : undefined,
                        }
                        : undefined,
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
        }));
    }
    timelineSnapshot() {
        return this.timelineEvents.map((event) => ({
            ...event,
            correlation: { ...event.correlation },
            authority: {
                ...event.authority,
                roles: event.authority.roles ? [...event.authority.roles] : undefined,
            },
            guards: event.guards
                ? {
                    runtimeOutcome: event.guards.runtimeOutcome,
                    runtimeReasonCodes: event.guards.runtimeReasonCodes ? [...event.guards.runtimeReasonCodes] : undefined,
                    dispatchOutcome: event.guards.dispatchOutcome,
                    dispatchReasonCodes: event.guards.dispatchReasonCodes ? [...event.guards.dispatchReasonCodes] : undefined,
                    dispatchRerouteTarget: event.guards.dispatchRerouteTarget,
                }
                : undefined,
            sideEffect: event.sideEffect
                ? {
                    intent: event.sideEffect.intent,
                    completed: event.sideEffect.completed,
                    hints: event.sideEffect.hints ? [...event.sideEffect.hints] : undefined,
                }
                : undefined,
            metadata: event.metadata ? { ...event.metadata } : undefined,
            integrity: { ...event.integrity },
        }));
    }
    verifyIntegrity() {
        return (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({
            ledgerEntries: this.snapshot(),
            timelineEvents: this.timelineSnapshot(),
        });
    }
    verifyIntegrityWithSignals() {
        const integrity = this.verifyIntegrity();
        const signals = (0, cognitive_signal_system_1.deriveIntegritySignals)(integrity, {}, "execution_ledger");
        return { integrity, signals };
    }
    verifyTimelineIntegrity() {
        return (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({
            timelineEvents: this.timelineSnapshot(),
        });
    }
    detectSideEffectDrift() {
        const timelineEvents = this.timelineSnapshot();
        const integrityResult = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents });
        return (0, side_effect_drift_detector_1.detectSideEffectDrift)({
            timelineEvents,
            integrityResult,
        });
    }
    detectSideEffectDriftWithSignals() {
        const drift = this.detectSideEffectDrift();
        const signals = (0, cognitive_signal_system_1.deriveDriftSignals)(drift, {}, "execution_ledger");
        return { drift, signals };
    }
    async persist(entry) {
        if (!this.durableJsonlPath) {
            return;
        }
        if (!this.durablePathReady) {
            await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.durableJsonlPath), { recursive: true });
            this.durablePathReady = true;
        }
        await (0, promises_1.appendFile)(this.durableJsonlPath, `${JSON.stringify(entry)}\n`, "utf8");
    }
    async persistTimelineEvent(event) {
        if (!this.durableTimelineJsonlPath) {
            return;
        }
        if (!this.durableTimelinePathReady) {
            await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.durableTimelineJsonlPath), { recursive: true });
            this.durableTimelinePathReady = true;
        }
        await (0, promises_1.appendFile)(this.durableTimelineJsonlPath, `${JSON.stringify(event)}\n`, "utf8");
    }
}
exports.ExecutionLedger = ExecutionLedger;
let singleton;
function getExecutionLedger() {
    singleton ?? (singleton = new ExecutionLedger());
    return singleton;
}
function resetExecutionLedgerForTests() {
    singleton = undefined;
}
async function verifyRuntimeTimelineJsonlIntegrity(filePath) {
    return (0, ledger_integrity_verifier_1.verifyCanonicalTimelineJsonlFile)(filePath);
}
async function detectRuntimeTimelineSideEffectDrift(filePath) {
    return (0, side_effect_drift_detector_1.detectSideEffectDriftForTimelineJsonlFile)(filePath, { verifyIntegrity: true });
}
