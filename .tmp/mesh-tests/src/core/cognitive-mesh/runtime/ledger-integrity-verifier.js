"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyLedgerIntegrity = verifyLedgerIntegrity;
exports.formatLedgerIntegritySummary = formatLedgerIntegritySummary;
exports.readJsonlRecords = readJsonlRecords;
exports.verifyCanonicalTimelineJsonlFile = verifyCanonicalTimelineJsonlFile;
const promises_1 = require("node:fs/promises");
const timeline_canonicalizer_1 = require("./timeline-canonicalizer");
const TERMINAL_STAGES = new Set([
    "execution_completed",
    "execution_failed",
    "execution_denied",
    "execution_redirected",
]);
function addFinding(state, finding) {
    state.findings.push(finding);
}
function invertCanonicalEventType(eventType) {
    switch (eventType) {
        case "DISPATCH_GUARD_EVALUATED":
            return "dispatch.guard.evaluated";
        case "DISPATCH_STARTED":
            return "dispatch.started";
        case "DISPATCH_COMPLETED":
            return "dispatch.completed";
        case "DISPATCH_DENIED":
            return "dispatch.denied";
        case "RUNTIME_GUARD_TRIGGERED":
            return "runtime.guard.evaluated";
        case "EXECUTION_STARTED":
            return "execution.started";
        case "EXECUTION_COMPLETED":
            return "execution.completed";
        case "EXECUTION_FAILED":
            return "execution.failed";
        case "EXECUTION_DENIED":
            return "execution.denied";
        case "EXECUTION_REDIRECTED":
            return "execution.redirected";
        case "EXECUTION_DEGRADED":
            return "execution.degraded";
        case "EXECUTION_AUDIT_REQUIRED":
            return "execution.audit_required";
        case "SIDE_EFFECT_INTENT":
            return "side_effect.intent";
        case "SIDE_EFFECT_COMPLETED":
            return "side_effect.completed";
    }
}
function asReasonObjects(codes) {
    return (codes ?? []).map((code) => ({ code, detail: "" }));
}
function toLedgerLikeFromTimeline(event) {
    return {
        entryId: `entry_from_${event.eventId}`,
        timestamp: event.timestamp,
        category: event.category,
        eventType: invertCanonicalEventType(event.eventType),
        action: event.action,
        source: event.source,
        target: event.target,
        ids: {
            requestId: event.correlation.requestId,
            executionId: event.correlation.executionId ?? event.executionId,
            correlationId: event.correlation.correlationId,
            sessionId: event.correlation.sessionId,
        },
        mode: event.mode,
        status: event.outcome,
        guard: event.guards
            ? {
                runtime: event.guards.runtimeOutcome
                    ? {
                        outcome: event.guards.runtimeOutcome,
                        reasons: asReasonObjects(event.guards.runtimeReasonCodes),
                    }
                    : undefined,
                dispatch: event.guards.dispatchOutcome
                    ? {
                        outcome: event.guards.dispatchOutcome,
                        reasons: asReasonObjects(event.guards.dispatchReasonCodes),
                        reroute: event.guards.dispatchRerouteTarget
                            ? {
                                target: event.guards.dispatchRerouteTarget,
                            }
                            : undefined,
                    }
                    : undefined,
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
    };
}
function isIsoDate(value) {
    return Number.isFinite(Date.parse(value));
}
function verifyRequiredFields(event, index, state) {
    const requiredFields = [
        "schemaVersion",
        "executionId",
        "eventId",
        "stableIdentity",
        "sequenceNo",
        "timestamp",
        "eventType",
        "category",
        "layer",
        "stage",
        "action",
        "source",
        "target",
        "actorType",
        "mode",
        "status",
        "outcome",
        "correlation",
        "authority",
        "integrity",
    ];
    for (const field of requiredFields) {
        const value = event[field];
        const missing = value == null ||
            (typeof value === "string" && value.trim().length === 0) ||
            (typeof value === "number" && !Number.isFinite(value));
        if (missing) {
            addFinding(state, {
                code: "STRUCTURE_MISSING_REQUIRED_FIELD",
                severity: "error",
                scope: "record",
                message: `Missing required field '${field}'.`,
                executionId: event.executionId,
                eventId: event.eventId,
                sequenceNo: event.sequenceNo,
                index,
            });
        }
    }
    if (!isIsoDate(event.timestamp)) {
        addFinding(state, {
            code: "TIMESTAMP_INVALID",
            severity: "error",
            scope: "record",
            message: "timestamp is not a valid ISO date-time.",
            executionId: event.executionId,
            eventId: event.eventId,
            sequenceNo: event.sequenceNo,
            index,
        });
    }
}
function verifyTimelineStream(executionId, events, state) {
    const inputOrder = [...events];
    let previousInputSequence = -1;
    for (const entry of inputOrder) {
        if (entry.event.sequenceNo < previousInputSequence) {
            addFinding(state, {
                code: "SEQUENCE_OUT_OF_ORDER",
                severity: "error",
                scope: "stream",
                message: "sequence number decreased in stream input order.",
                executionId,
                eventId: entry.event.eventId,
                sequenceNo: entry.event.sequenceNo,
                index: entry.index,
            });
        }
        previousInputSequence = entry.event.sequenceNo;
    }
    const bySequence = [...events].sort((a, b) => a.event.sequenceNo - b.event.sequenceNo || a.index - b.index);
    if (bySequence.length > 0 && bySequence[0]?.event.sequenceNo !== 1) {
        addFinding(state, {
            code: "SEQUENCE_START_INVALID",
            severity: "warning",
            scope: "stream",
            message: "stream does not start at sequence 1.",
            executionId,
            eventId: bySequence[0]?.event.eventId,
            sequenceNo: bySequence[0]?.event.sequenceNo,
            index: bySequence[0]?.index,
        });
    }
    const stableIdentitySeen = new Map();
    let previous = null;
    let prevTimestamp = null;
    const terminalStages = [];
    for (let i = 0; i < bySequence.length; i += 1) {
        const current = bySequence[i].event;
        const currentIndex = bySequence[i].index;
        const expected = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(toLedgerLikeFromTimeline(current), {
            sequenceNo: current.sequenceNo,
            prevEventHash: current.integrity.prevEventHash,
        });
        if (current.stableIdentity !== expected.stableIdentity) {
            addFinding(state, {
                code: "STABLE_IDENTITY_MISMATCH",
                severity: "error",
                scope: "record",
                message: "stable identity does not match canonical recomputation.",
                executionId,
                eventId: current.eventId,
                sequenceNo: current.sequenceNo,
                index: currentIndex,
            });
        }
        if (current.eventId !== expected.eventId) {
            addFinding(state, {
                code: "EVENT_ID_MISMATCH",
                severity: "error",
                scope: "record",
                message: "event id does not match canonical recomputation.",
                executionId,
                eventId: current.eventId,
                sequenceNo: current.sequenceNo,
                index: currentIndex,
            });
        }
        if (current.integrity.eventHash !== expected.integrity.eventHash) {
            addFinding(state, {
                code: "CHAIN_EVENT_HASH_MISMATCH",
                severity: "error",
                scope: "record",
                message: "event hash does not match canonical recomputation.",
                executionId,
                eventId: current.eventId,
                sequenceNo: current.sequenceNo,
                index: currentIndex,
            });
        }
        if (previous) {
            if (current.sequenceNo === previous.sequenceNo) {
                addFinding(state, {
                    code: "SEQUENCE_DUPLICATE",
                    severity: "error",
                    scope: "stream",
                    message: "duplicate sequence number detected in stream.",
                    executionId,
                    eventId: current.eventId,
                    sequenceNo: current.sequenceNo,
                    index: currentIndex,
                });
            }
            else if (current.sequenceNo !== previous.sequenceNo + 1) {
                addFinding(state, {
                    code: "SEQUENCE_GAP",
                    severity: "error",
                    scope: "stream",
                    message: "sequence gap detected in stream.",
                    executionId,
                    eventId: current.eventId,
                    sequenceNo: current.sequenceNo,
                    index: currentIndex,
                    details: { expected: previous.sequenceNo + 1, actual: current.sequenceNo },
                });
            }
            if (current.integrity.prevEventHash !== previous.integrity.eventHash) {
                addFinding(state, {
                    code: "CHAIN_PREV_HASH_MISMATCH",
                    severity: "error",
                    scope: "stream",
                    message: "prevEventHash does not link to previous eventHash.",
                    executionId,
                    eventId: current.eventId,
                    sequenceNo: current.sequenceNo,
                    index: currentIndex,
                    details: {
                        expectedPrevEventHash: previous.integrity.eventHash,
                        actualPrevEventHash: current.integrity.prevEventHash,
                    },
                });
            }
            if (TERMINAL_STAGES.has(previous.stage)) {
                addFinding(state, {
                    code: "STREAM_CONTINUES_AFTER_TERMINAL",
                    severity: "warning",
                    scope: "stream",
                    message: "stream contains events after a terminal execution stage.",
                    executionId,
                    eventId: current.eventId,
                    sequenceNo: current.sequenceNo,
                    index: currentIndex,
                });
            }
        }
        else if (current.integrity.prevEventHash !== null) {
            addFinding(state, {
                code: "CHAIN_PREV_HASH_MISMATCH",
                severity: "error",
                scope: "stream",
                message: "first stream event must use null prevEventHash.",
                executionId,
                eventId: current.eventId,
                sequenceNo: current.sequenceNo,
                index: currentIndex,
            });
        }
        if (stableIdentitySeen.has(current.stableIdentity)) {
            addFinding(state, {
                code: "DUPLICATE_STABLE_IDENTITY",
                severity: "warning",
                scope: "stream",
                message: "duplicate stable identity detected in stream.",
                executionId,
                eventId: current.eventId,
                sequenceNo: current.sequenceNo,
                index: currentIndex,
                details: { firstEventId: stableIdentitySeen.get(current.stableIdentity) },
            });
        }
        else {
            stableIdentitySeen.set(current.stableIdentity, current.eventId);
        }
        const parsedTs = Date.parse(current.timestamp);
        if (Number.isFinite(parsedTs)) {
            if (prevTimestamp != null && parsedTs < prevTimestamp) {
                addFinding(state, {
                    code: "TIMESTAMP_NON_MONOTONIC",
                    severity: "warning",
                    scope: "stream",
                    message: "timestamp decreased relative to previous sequence event.",
                    executionId,
                    eventId: current.eventId,
                    sequenceNo: current.sequenceNo,
                    index: currentIndex,
                });
            }
            prevTimestamp = parsedTs;
        }
        if (current.stage === "execution_completed" || current.stage === "execution_failed" || current.stage === "execution_denied") {
            terminalStages.push(current.stage);
        }
        previous = current;
    }
    if (terminalStages.length > 1) {
        addFinding(state, {
            code: "STREAM_TERMINAL_DUPLICATE",
            severity: "warning",
            scope: "stream",
            message: "stream contains multiple terminal execution stages.",
            executionId,
            details: { terminalStages },
        });
    }
    const hasExecutionStarted = bySequence.some((event) => event.event.stage === "execution_started");
    const hasTerminal = bySequence.some((event) => TERMINAL_STAGES.has(event.event.stage));
    if (hasTerminal && !hasExecutionStarted) {
        addFinding(state, {
            code: "STAGE_TRANSITION_ANOMALY",
            severity: "warning",
            scope: "stream",
            message: "terminal execution stage exists without execution_started.",
            executionId,
        });
    }
    return {
        records: bySequence.length,
        sequenceMin: bySequence[0]?.event.sequenceNo ?? null,
        sequenceMax: bySequence[bySequence.length - 1]?.event.sequenceNo ?? null,
        terminalStages,
    };
}
function buildSummary(state, streamCount, recordCount) {
    const errorCount = state.findings.filter((finding) => finding.severity === "error").length;
    const warningCount = state.findings.filter((finding) => finding.severity === "warning").length;
    const invalidRecordIds = new Set(state.findings
        .filter((finding) => finding.scope === "record" && finding.severity === "error" && finding.eventId)
        .map((finding) => finding.eventId));
    const invalidRecordCount = invalidRecordIds.size;
    const validRecordCount = Math.max(0, recordCount - invalidRecordCount);
    const status = errorCount > 0 ? "invalid" : state.partial ? "partial" : warningCount > 0 ? "warning" : "valid";
    return {
        status,
        streamCount,
        recordCount,
        validRecordCount,
        invalidRecordCount,
        warningCount,
        errorCount,
        partial: state.partial,
    };
}
function verifyTimelineOnly(timelineEvents, state) {
    const eventIdSeen = new Set();
    for (let i = 0; i < timelineEvents.length; i += 1) {
        const event = timelineEvents[i];
        verifyRequiredFields(event, i, state);
        if (eventIdSeen.has(event.eventId)) {
            addFinding(state, {
                code: "DUPLICATE_EVENT_ID",
                severity: "error",
                scope: "dataset",
                message: "duplicate event id detected.",
                executionId: event.executionId,
                eventId: event.eventId,
                sequenceNo: event.sequenceNo,
                index: i,
            });
        }
        else {
            eventIdSeen.add(event.eventId);
        }
    }
    const streamMap = new Map();
    for (let i = 0; i < timelineEvents.length; i += 1) {
        const event = timelineEvents[i];
        const stream = streamMap.get(event.executionId) ?? [];
        stream.push({ event, index: i });
        streamMap.set(event.executionId, stream);
    }
    const streamStats = [];
    for (const executionId of [...streamMap.keys()].sort()) {
        const stats = verifyTimelineStream(executionId, streamMap.get(executionId) ?? [], state);
        streamStats.push({
            executionId,
            records: stats.records,
            sequenceMin: stats.sequenceMin,
            sequenceMax: stats.sequenceMax,
            terminalStages: [...stats.terminalStages],
        });
    }
    return { streamStats };
}
function deriveTimelineFromLedger(entries) {
    const sequenceByExecutionId = new Map();
    const prevHashByExecutionId = new Map();
    const out = [];
    for (const entry of entries) {
        const executionId = entry.ids.executionId || entry.ids.requestId || entry.ids.sessionId || entry.entryId;
        const nextSequence = (sequenceByExecutionId.get(executionId) ?? 0) + 1;
        sequenceByExecutionId.set(executionId, nextSequence);
        const prev = prevHashByExecutionId.get(executionId) ?? null;
        const canonical = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(entry, { sequenceNo: nextSequence, prevEventHash: prev });
        prevHashByExecutionId.set(executionId, canonical.integrity.eventHash);
        out.push(canonical);
    }
    return out;
}
function compareLedgerDerivedAndTimeline(expected, actual, state) {
    if (expected.length !== actual.length) {
        addFinding(state, {
            code: "LEDGER_TIMELINE_LENGTH_MISMATCH",
            severity: "warning",
            scope: "dataset",
            message: "ledger-derived timeline count differs from canonical timeline count.",
            details: { expected: expected.length, actual: actual.length },
        });
    }
    const actualByEventId = new Map(actual.map((event) => [event.eventId, event]));
    const expectedByEventId = new Map(expected.map((event) => [event.eventId, event]));
    for (const expectedEvent of expected) {
        const actualEvent = actualByEventId.get(expectedEvent.eventId);
        if (!actualEvent) {
            addFinding(state, {
                code: "LEDGER_TIMELINE_MISSING_EVENT",
                severity: "error",
                scope: "dataset",
                message: "timeline sidecar is missing a ledger-derived event.",
                executionId: expectedEvent.executionId,
                eventId: expectedEvent.eventId,
                sequenceNo: expectedEvent.sequenceNo,
            });
            continue;
        }
        const mismatchedFields = [];
        if (actualEvent.stableIdentity !== expectedEvent.stableIdentity)
            mismatchedFields.push("stableIdentity");
        if (actualEvent.integrity.eventHash !== expectedEvent.integrity.eventHash)
            mismatchedFields.push("integrity.eventHash");
        if (actualEvent.integrity.prevEventHash !== expectedEvent.integrity.prevEventHash)
            mismatchedFields.push("integrity.prevEventHash");
        if (actualEvent.sequenceNo !== expectedEvent.sequenceNo)
            mismatchedFields.push("sequenceNo");
        if (actualEvent.executionId !== expectedEvent.executionId)
            mismatchedFields.push("executionId");
        if (mismatchedFields.length > 0) {
            addFinding(state, {
                code: "LEDGER_TIMELINE_EVENT_MISMATCH",
                severity: "error",
                scope: "record",
                message: "timeline sidecar event differs from ledger-derived canonical event.",
                executionId: expectedEvent.executionId,
                eventId: expectedEvent.eventId,
                sequenceNo: expectedEvent.sequenceNo,
                details: { mismatchedFields },
            });
        }
    }
    for (const actualEvent of actual) {
        if (!expectedByEventId.has(actualEvent.eventId)) {
            addFinding(state, {
                code: "LEDGER_TIMELINE_ORPHAN_EVENT",
                severity: "warning",
                scope: "dataset",
                message: "timeline sidecar contains an event not derivable from ledger entries.",
                executionId: actualEvent.executionId,
                eventId: actualEvent.eventId,
                sequenceNo: actualEvent.sequenceNo,
            });
        }
    }
}
function normalizeFindings(findings) {
    return [...findings].sort((a, b) => {
        const streamA = a.executionId ?? "";
        const streamB = b.executionId ?? "";
        if (streamA !== streamB)
            return streamA.localeCompare(streamB);
        const seqA = a.sequenceNo ?? -1;
        const seqB = b.sequenceNo ?? -1;
        if (seqA !== seqB)
            return seqA - seqB;
        const idxA = a.index ?? -1;
        const idxB = b.index ?? -1;
        if (idxA !== idxB)
            return idxA - idxB;
        return a.code.localeCompare(b.code);
    });
}
function verifyLedgerIntegrity(input) {
    const state = { findings: [], partial: false };
    const derivedTimeline = input.ledgerEntries ? deriveTimelineFromLedger(input.ledgerEntries) : undefined;
    const timeline = input.timelineEvents ?? derivedTimeline ?? [];
    if (!input.timelineEvents && derivedTimeline) {
        state.partial = true;
        addFinding(state, {
            code: "PARTIAL_VERIFICATION_TIMELINE_DERIVED",
            severity: "warning",
            scope: "dataset",
            message: "timeline verification derived from execution ledger; sidecar timeline was not provided.",
        });
    }
    const { streamStats } = verifyTimelineOnly(timeline, state);
    if (input.ledgerEntries && input.timelineEvents) {
        compareLedgerDerivedAndTimeline(derivedTimeline ?? [], input.timelineEvents, state);
    }
    const findings = normalizeFindings(state.findings);
    return {
        summary: buildSummary({ ...state, findings }, streamStats.length, timeline.length),
        findings,
        streamStats,
    };
}
function formatLedgerIntegritySummary(result) {
    return [
        `status=${result.summary.status}`,
        `streams=${result.summary.streamCount}`,
        `records=${result.summary.recordCount}`,
        `errors=${result.summary.errorCount}`,
        `warnings=${result.summary.warningCount}`,
        `invalid_records=${result.summary.invalidRecordCount}`,
        `partial=${result.summary.partial}`,
    ].join(" ");
}
async function readJsonlRecords(filePath) {
    try {
        const text = await (0, promises_1.readFile)(filePath, "utf8");
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
        const records = [];
        const parseFindings = [];
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            try {
                records.push(JSON.parse(line));
            }
            catch (error) {
                parseFindings.push({
                    code: "JSONL_PARSE_ERROR",
                    severity: "error",
                    scope: "dataset",
                    message: "failed to parse JSONL line.",
                    index: i,
                    details: { error: error instanceof Error ? error.message : String(error) },
                });
            }
        }
        return { records, parseFindings };
    }
    catch (error) {
        return {
            records: [],
            parseFindings: [
                {
                    code: "JSONL_PARSE_ERROR",
                    severity: "error",
                    scope: "dataset",
                    message: "failed to read JSONL file.",
                    details: { error: error instanceof Error ? error.message : String(error), filePath },
                },
            ],
        };
    }
}
async function verifyCanonicalTimelineJsonlFile(filePath) {
    const { records, parseFindings } = await readJsonlRecords(filePath);
    const typed = records.filter((record) => Boolean(record && typeof record === "object"));
    const result = verifyLedgerIntegrity({ timelineEvents: typed });
    const findings = normalizeFindings([...parseFindings, ...result.findings]);
    const partial = result.summary.partial;
    return {
        ...result,
        findings,
        summary: {
            ...result.summary,
            errorCount: findings.filter((finding) => finding.severity === "error").length,
            warningCount: findings.filter((finding) => finding.severity === "warning").length,
            invalidRecordCount: new Set(findings
                .filter((finding) => finding.scope === "record" && finding.severity === "error" && finding.eventId)
                .map((finding) => finding.eventId)).size,
            validRecordCount: Math.max(0, result.summary.recordCount - new Set(findings
                .filter((finding) => finding.scope === "record" && finding.severity === "error" && finding.eventId)
                .map((finding) => finding.eventId)).size),
            status: findings.some((finding) => finding.severity === "error")
                ? "invalid"
                : partial
                    ? "partial"
                    : findings.some((finding) => finding.severity === "warning")
                        ? "warning"
                        : "valid",
        },
    };
}
