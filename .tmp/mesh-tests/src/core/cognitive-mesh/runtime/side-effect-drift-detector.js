"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSideEffectDrift = detectSideEffectDrift;
exports.formatSideEffectDriftSummary = formatSideEffectDriftSummary;
exports.detectSideEffectDriftForTimelineJsonlFile = detectSideEffectDriftForTimelineJsonlFile;
const ledger_integrity_verifier_1 = require("./ledger-integrity-verifier");
const timeline_canonicalizer_1 = require("./timeline-canonicalizer");
function addFinding(state, finding) {
    state.findings.push(finding);
}
function sideEffectSignature(event) {
    return `${event.action}|${event.source}|${event.target}`;
}
function deriveTimelineFromLedger(input) {
    if (!input) {
        return [];
    }
    const sequenceByExecutionId = new Map();
    const prevHashByExecutionId = new Map();
    const out = [];
    for (const entry of input) {
        const canonicalExecutionId = (0, timeline_canonicalizer_1.resolveCanonicalExecutionId)(entry);
        const sequenceNo = (sequenceByExecutionId.get(canonicalExecutionId) ?? 0) + 1;
        sequenceByExecutionId.set(canonicalExecutionId, sequenceNo);
        const prevEventHash = prevHashByExecutionId.get(canonicalExecutionId) ?? null;
        const timelineEvent = (0, timeline_canonicalizer_1.canonicalizeExecutionLedgerEntry)(entry, { sequenceNo, prevEventHash });
        prevHashByExecutionId.set(canonicalExecutionId, timelineEvent.integrity.eventHash);
        out.push(timelineEvent);
    }
    return out;
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
function findIntegrityStatus(input, timeline) {
    if (input.integrityResult) {
        return input.integrityResult;
    }
    if (input.verifyIntegrityIfMissing) {
        return (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: timeline });
    }
    return undefined;
}
function detectStreamDrift(executionId, stream, state) {
    const events = [...stream].sort((a, b) => a.event.sequenceNo - b.event.sequenceNo || a.index - b.index);
    const intents = [];
    const completions = [];
    const completionSignatureCounts = new Map();
    const intentSignatureCounts = new Map();
    let sequenceDispatchStarted;
    let sequenceExecutionStarted;
    let sequenceExecutionCompleted;
    let sequenceDenied;
    let sequenceSafeModeRedirect;
    let sequenceTerminal;
    for (const entry of events) {
        const event = entry.event;
        if (event.stage === "dispatch_started" && sequenceDispatchStarted == null) {
            sequenceDispatchStarted = event.sequenceNo;
        }
        if (event.stage === "execution_started" && sequenceExecutionStarted == null) {
            sequenceExecutionStarted = event.sequenceNo;
        }
        if (event.stage === "execution_completed" && sequenceExecutionCompleted == null) {
            sequenceExecutionCompleted = event.sequenceNo;
        }
        if ((event.stage === "execution_denied" || event.stage === "execution_redirected") && sequenceDenied == null) {
            sequenceDenied = event.sequenceNo;
        }
        if (event.mode === "safe_mode_redirect" && sequenceSafeModeRedirect == null) {
            sequenceSafeModeRedirect = event.sequenceNo;
        }
        if (sequenceTerminal == null &&
            (event.stage === "execution_completed" ||
                event.stage === "execution_failed" ||
                event.stage === "execution_denied" ||
                event.stage === "execution_redirected")) {
            sequenceTerminal = event.sequenceNo;
        }
        if (event.stage === "side_effect_intent") {
            intents.push({ event, index: entry.index, matched: false });
            const key = sideEffectSignature(event);
            intentSignatureCounts.set(key, (intentSignatureCounts.get(key) ?? 0) + 1);
        }
        else if (event.stage === "side_effect_completed") {
            completions.push({ event, index: entry.index });
            const key = sideEffectSignature(event);
            completionSignatureCounts.set(key, (completionSignatureCounts.get(key) ?? 0) + 1);
        }
    }
    let matched = 0;
    let completedAfterDenied = 0;
    let completedAfterTerminal = 0;
    for (const completion of completions) {
        const completionSig = sideEffectSignature(completion.event);
        let matchedIntent = intents.find((intent) => !intent.matched && sideEffectSignature(intent.event) === completionSig && intent.event.sequenceNo <= completion.event.sequenceNo);
        if (!matchedIntent) {
            const sameTarget = intents.find((intent) => !intent.matched && intent.event.target === completion.event.target && intent.event.sequenceNo <= completion.event.sequenceNo);
            const sameAction = intents.find((intent) => !intent.matched && intent.event.action === completion.event.action && intent.event.sequenceNo <= completion.event.sequenceNo);
            const laterIntent = intents.find((intent) => !intent.matched && sideEffectSignature(intent.event) === completionSig && intent.event.sequenceNo > completion.event.sequenceNo);
            if (laterIntent) {
                addFinding(state, {
                    code: "COMPLETION_BEFORE_INTENT",
                    severity: "high",
                    scope: "side_effect",
                    message: "side effect completion occurred before matching intent.",
                    executionId,
                    eventId: completion.event.eventId,
                    sequenceNo: completion.event.sequenceNo,
                    index: completion.index,
                    details: { laterIntentEventId: laterIntent.event.eventId },
                });
            }
            else if (sameTarget) {
                addFinding(state, {
                    code: "COMPLETION_MISMATCH_ACTION",
                    severity: "high",
                    scope: "side_effect",
                    message: "side effect completion target matched, but action diverged from intent.",
                    executionId,
                    eventId: completion.event.eventId,
                    sequenceNo: completion.event.sequenceNo,
                    index: completion.index,
                    details: { intendedAction: sameTarget.event.action, completedAction: completion.event.action },
                });
            }
            else if (sameAction) {
                addFinding(state, {
                    code: "COMPLETION_MISMATCH_TARGET",
                    severity: "high",
                    scope: "side_effect",
                    message: "side effect completion action matched, but target diverged from intent.",
                    executionId,
                    eventId: completion.event.eventId,
                    sequenceNo: completion.event.sequenceNo,
                    index: completion.index,
                    details: { intendedTarget: sameAction.event.target, completedTarget: completion.event.target },
                });
            }
            else {
                addFinding(state, {
                    code: "COMPLETION_WITHOUT_INTENT",
                    severity: "critical",
                    scope: "side_effect",
                    message: "side effect completion has no prior matching intent.",
                    executionId,
                    eventId: completion.event.eventId,
                    sequenceNo: completion.event.sequenceNo,
                    index: completion.index,
                });
            }
        }
        else {
            matchedIntent.matched = true;
            matched += 1;
            if (matchedIntent.event.mode !== completion.event.mode) {
                addFinding(state, {
                    code: "COMPLETION_MISMATCH_MODE",
                    severity: matchedIntent.event.mode === "reroute" || matchedIntent.event.mode === "degraded" ? "high" : "medium",
                    scope: "side_effect",
                    message: "side effect completion mode diverged from intended mode.",
                    executionId,
                    eventId: completion.event.eventId,
                    sequenceNo: completion.event.sequenceNo,
                    index: completion.index,
                    details: { intendedMode: matchedIntent.event.mode, completedMode: completion.event.mode },
                });
            }
        }
        if (sequenceDenied != null && completion.event.sequenceNo > sequenceDenied) {
            completedAfterDenied += 1;
            addFinding(state, {
                code: completion.event.mode === "safe_mode_redirect" ? "COMPLETION_AFTER_SAFE_MODE_REDIRECT" : "COMPLETION_AFTER_DENIED_FLOW",
                severity: "critical",
                scope: "stream",
                message: "side effect completion occurred after denied/redirected execution flow.",
                executionId,
                eventId: completion.event.eventId,
                sequenceNo: completion.event.sequenceNo,
                index: completion.index,
            });
        }
        else if (sequenceSafeModeRedirect != null && completion.event.sequenceNo > sequenceSafeModeRedirect) {
            addFinding(state, {
                code: "COMPLETION_AFTER_SAFE_MODE_REDIRECT",
                severity: "critical",
                scope: "stream",
                message: "side effect completion occurred after safe-mode redirect signal.",
                executionId,
                eventId: completion.event.eventId,
                sequenceNo: completion.event.sequenceNo,
                index: completion.index,
            });
        }
        if (sequenceTerminal != null && completion.event.sequenceNo > sequenceTerminal) {
            completedAfterTerminal += 1;
            addFinding(state, {
                code: "COMPLETION_AFTER_TERMINAL",
                severity: "high",
                scope: "stream",
                message: "side effect completion occurred after terminal execution stage.",
                executionId,
                eventId: completion.event.eventId,
                sequenceNo: completion.event.sequenceNo,
                index: completion.index,
            });
        }
        if ((sequenceDispatchStarted != null && completion.event.sequenceNo < sequenceDispatchStarted) ||
            (sequenceExecutionStarted != null && completion.event.sequenceNo < sequenceExecutionStarted)) {
            addFinding(state, {
                code: "COMPLETION_IN_INVALID_STAGE_ORDER",
                severity: "medium",
                scope: "stream",
                message: "side effect completion occurred before dispatch/execution start stages.",
                executionId,
                eventId: completion.event.eventId,
                sequenceNo: completion.event.sequenceNo,
                index: completion.index,
            });
        }
    }
    for (const intent of intents) {
        if (!intent.matched) {
            const maybeTerminal = sequenceExecutionCompleted ?? sequenceTerminal;
            if (maybeTerminal == null || intent.event.sequenceNo <= maybeTerminal) {
                addFinding(state, {
                    code: "INTENT_WITHOUT_COMPLETION",
                    severity: "high",
                    scope: "side_effect",
                    message: "side effect intent has no matching completion.",
                    executionId,
                    eventId: intent.event.eventId,
                    sequenceNo: intent.event.sequenceNo,
                    index: intent.index,
                });
            }
        }
    }
    if (sequenceExecutionCompleted != null) {
        const missingBeforeCompleted = intents.filter((intent) => !intent.matched && intent.event.sequenceNo <= sequenceExecutionCompleted);
        if (missingBeforeCompleted.length > 0) {
            addFinding(state, {
                code: "REQUIRED_SIDE_EFFECT_MISSING_BEFORE_EXECUTION_COMPLETED",
                severity: "high",
                scope: "stream",
                message: "execution completed while required side effect completions were missing.",
                executionId,
                sequenceNo: sequenceExecutionCompleted,
                details: { missingIntentCount: missingBeforeCompleted.length },
            });
        }
    }
    for (const [signature, completionCount] of completionSignatureCounts.entries()) {
        const intentCount = intentSignatureCounts.get(signature) ?? 0;
        if (completionCount > Math.max(1, intentCount)) {
            const first = completions.find((completion) => sideEffectSignature(completion.event) === signature);
            addFinding(state, {
                code: "DUPLICATE_COMPLETION",
                severity: "medium",
                scope: "side_effect",
                message: "duplicate side effect completions detected for same signature.",
                executionId,
                eventId: first?.event.eventId,
                sequenceNo: first?.event.sequenceNo,
                index: first?.index,
                details: { signature, completionCount, intentCount },
            });
        }
    }
    const unmatchedIntents = intents.filter((intent) => !intent.matched).length;
    const unmatchedCompletions = Math.max(0, completions.length - matched);
    return {
        executionId,
        intents: intents.length,
        completions: completions.length,
        matched,
        unmatchedIntents,
        unmatchedCompletions,
        completedAfterDenied,
        completedAfterTerminal,
    };
}
function buildSummary(timelineEvents, streamStats, findings, partial, integrity) {
    const driftFindingCount = findings.filter((finding) => finding.code !== "INTEGRITY_NOT_VALIDATED" && finding.code !== "INTEGRITY_INVALID_INPUT" && finding.code !== "JSONL_PARSE_ERROR").length;
    const warningCount = findings.filter((finding) => finding.severity === "low" || finding.severity === "medium").length;
    const intentCount = timelineEvents.filter((event) => event.stage === "side_effect_intent").length;
    const completionCount = timelineEvents.filter((event) => event.stage === "side_effect_completed").length;
    const matchedCount = streamStats.reduce((sum, stat) => sum + stat.matched, 0);
    const unmatchedIntentCount = streamStats.reduce((sum, stat) => sum + stat.unmatchedIntents, 0);
    const unmatchedCompletionCount = streamStats.reduce((sum, stat) => sum + stat.unmatchedCompletions, 0);
    let status = "no_drift";
    if (driftFindingCount > 0) {
        status = "drift_detected";
    }
    else if (partial) {
        status = "partial";
    }
    else if (integrity?.summary.status === "invalid") {
        status = "inconclusive";
    }
    else if (findings.length > 0) {
        status = "warning";
    }
    return {
        status,
        streamCount: streamStats.length,
        recordCount: timelineEvents.length,
        sideEffectIntentCount: intentCount,
        sideEffectCompletionCount: completionCount,
        matchedSideEffectCount: matchedCount,
        unmatchedIntentCount,
        unmatchedCompletionCount,
        driftFindingCount,
        warningCount,
        partial,
        integrityStatus: integrity ? integrity.summary.status : "not_validated",
    };
}
function detectSideEffectDrift(input) {
    const timeline = input.timelineEvents ?? deriveTimelineFromLedger(input.ledgerEntries);
    const state = { findings: [], partial: false };
    const integrity = findIntegrityStatus(input, timeline);
    if (!integrity) {
        addFinding(state, {
            code: "INTEGRITY_NOT_VALIDATED",
            severity: "low",
            scope: "dataset",
            message: "integrity verification was not supplied for drift analysis input.",
        });
    }
    else if (integrity.summary.status === "invalid") {
        addFinding(state, {
            code: "INTEGRITY_INVALID_INPUT",
            severity: "medium",
            scope: "dataset",
            message: "integrity verification reported invalid input; drift findings may be inconclusive.",
            details: { integrityStatus: integrity.summary.status },
        });
    }
    if (!input.timelineEvents && input.ledgerEntries) {
        state.partial = true;
    }
    const streamMap = new Map();
    for (let i = 0; i < timeline.length; i += 1) {
        const event = timeline[i];
        const list = streamMap.get(event.executionId) ?? [];
        list.push({ event, index: i });
        streamMap.set(event.executionId, list);
    }
    const streamStats = [];
    for (const executionId of [...streamMap.keys()].sort()) {
        streamStats.push(detectStreamDrift(executionId, streamMap.get(executionId) ?? [], state));
    }
    const findings = normalizeFindings(state.findings);
    return {
        summary: buildSummary(timeline, streamStats, findings, state.partial, integrity),
        findings,
        streamStats,
        integrity,
    };
}
function formatSideEffectDriftSummary(result) {
    return [
        `status=${result.summary.status}`,
        `streams=${result.summary.streamCount}`,
        `records=${result.summary.recordCount}`,
        `intents=${result.summary.sideEffectIntentCount}`,
        `completions=${result.summary.sideEffectCompletionCount}`,
        `matched=${result.summary.matchedSideEffectCount}`,
        `drift_findings=${result.summary.driftFindingCount}`,
        `warnings=${result.summary.warningCount}`,
        `integrity=${result.summary.integrityStatus ?? "not_validated"}`,
        `partial=${result.summary.partial}`,
    ].join(" ");
}
async function detectSideEffectDriftForTimelineJsonlFile(filePath, options) {
    const { records, parseFindings } = await (0, ledger_integrity_verifier_1.readJsonlRecords)(filePath);
    const timeline = records.filter((record) => Boolean(record && typeof record === "object"));
    const integrity = options?.verifyIntegrity === true ? (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: timeline }) : undefined;
    const result = detectSideEffectDrift({
        timelineEvents: timeline,
        integrityResult: integrity,
        verifyIntegrityIfMissing: false,
    });
    const parseDriftFindings = parseFindings.map((finding) => ({
        code: "JSONL_PARSE_ERROR",
        severity: "medium",
        scope: "dataset",
        message: finding.message,
        index: finding.index,
        details: finding.details,
    }));
    const findings = normalizeFindings([...parseDriftFindings, ...result.findings]);
    const summary = buildSummary(timeline, result.streamStats, findings, result.summary.partial || parseDriftFindings.length > 0, integrity);
    if (parseDriftFindings.length > 0 && summary.status === "no_drift") {
        summary.status = "partial";
    }
    return {
        ...result,
        findings,
        summary,
        integrity,
    };
}
