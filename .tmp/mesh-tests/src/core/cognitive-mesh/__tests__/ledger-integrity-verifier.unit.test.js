"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const execution_ledger_1 = require("../runtime/execution-ledger");
const ledger_integrity_verifier_1 = require("../runtime/ledger-integrity-verifier");
function buildLedgerWithValidStream() {
    const ledger = new execution_ledger_1.ExecutionLedger("", "");
    ledger.append({
        category: "dispatch",
        eventType: "dispatch.guard.evaluated",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: { executionId: "exec-integrity-1", requestId: "req-integrity-1", correlationId: "req-integrity-1" },
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "runtime",
        eventType: "runtime.guard.evaluated",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: { executionId: "exec-integrity-1", requestId: "req-integrity-1", correlationId: "req-integrity-1" },
        mode: "normal",
        status: "evaluated",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.started",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: { executionId: "exec-integrity-1", requestId: "req-integrity-1", correlationId: "req-integrity-1" },
        mode: "normal",
        status: "started",
    });
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: { executionId: "exec-integrity-1", requestId: "req-integrity-1", correlationId: "req-integrity-1" },
        mode: "normal",
        status: "completed",
    });
    return ledger;
}
(0, node_test_1.test)("ledger integrity verifier passes valid canonical timeline chain", () => {
    const ledger = buildLedgerWithValidStream();
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({
        timelineEvents: ledger.timelineSnapshot(),
        ledgerEntries: ledger.snapshot(),
    });
    assert.equal(result.summary.status, "valid");
    assert.equal(result.summary.errorCount, 0);
    assert.equal(result.summary.warningCount, 0);
});
(0, node_test_1.test)("execution ledger exposes integrity verification signals for non-valid states", () => {
    const ledger = new execution_ledger_1.ExecutionLedger("", "");
    ledger.append({
        category: "execution",
        eventType: "execution.completed",
        action: "dispatch",
        source: "mesh_live_runtime",
        target: "/api/demo/chat",
        ids: { executionId: "exec-integrity-signal", requestId: "req-integrity-signal" },
        mode: "normal",
        status: "completed",
    });
    const withSignals = ledger.verifyIntegrityWithSignals();
    assert.equal(withSignals.integrity.summary.status, "warning");
    assert.equal(withSignals.signals.length, 1);
    assert.equal(withSignals.signals[0]?.signalType, "integrity_warning");
});
(0, node_test_1.test)("ledger integrity verifier detects broken prev hash chain", () => {
    const ledger = buildLedgerWithValidStream();
    const timeline = ledger.timelineSnapshot();
    const tampered = timeline.map((event) => ({ ...event, integrity: { ...event.integrity } }));
    if (tampered[2]) {
        tampered[2].integrity.prevEventHash = "broken_prev_hash";
    }
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: tampered });
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "CHAIN_PREV_HASH_MISMATCH"), true);
});
(0, node_test_1.test)("ledger integrity verifier detects hash mismatch and stable identity mismatch", () => {
    const ledger = buildLedgerWithValidStream();
    const tampered = ledger.timelineSnapshot().map((event) => ({
        ...event,
        integrity: { ...event.integrity },
    }));
    if (tampered[1]) {
        tampered[1].action = "tampered_action";
        tampered[1].integrity.eventHash = "tampered_hash";
    }
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: tampered });
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "CHAIN_EVENT_HASH_MISMATCH"), true);
    assert.equal(result.findings.some((finding) => finding.code === "STABLE_IDENTITY_MISMATCH"), true);
});
(0, node_test_1.test)("ledger integrity verifier detects sequence disorder deterministically", () => {
    const ledger = buildLedgerWithValidStream();
    const timeline = ledger.timelineSnapshot();
    const tampered = timeline.map((event) => ({ ...event, integrity: { ...event.integrity } }));
    if (tampered[0]) {
        tampered[0].sequenceNo = 2;
    }
    if (tampered[1]) {
        tampered[1].sequenceNo = 1;
    }
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: tampered });
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "SEQUENCE_OUT_OF_ORDER" ||
        finding.code === "SEQUENCE_GAP" ||
        finding.code === "SEQUENCE_DUPLICATE" ||
        finding.code === "SEQUENCE_START_INVALID"), true);
});
(0, node_test_1.test)("ledger integrity verifier detects missing required fields", () => {
    const ledger = buildLedgerWithValidStream();
    const tampered = ledger.timelineSnapshot().map((event) => ({
        ...event,
        integrity: { ...event.integrity },
    }));
    if (tampered[0]) {
        tampered[0].eventId = "";
    }
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ timelineEvents: tampered });
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "STRUCTURE_MISSING_REQUIRED_FIELD"), true);
});
(0, node_test_1.test)("ledger integrity verifier returns partial when timeline is derived from ledger only", () => {
    const ledger = buildLedgerWithValidStream();
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({ ledgerEntries: ledger.snapshot() });
    assert.equal(result.summary.status, "partial");
    assert.equal(result.summary.partial, true);
    assert.equal(result.findings.some((finding) => finding.code === "PARTIAL_VERIFICATION_TIMELINE_DERIVED"), true);
});
(0, node_test_1.test)("ledger and timeline mismatch is reported deterministically", () => {
    const ledger = buildLedgerWithValidStream();
    const timeline = ledger.timelineSnapshot().map((event) => ({
        ...event,
        integrity: { ...event.integrity },
    }));
    timeline.pop();
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({
        ledgerEntries: ledger.snapshot(),
        timelineEvents: timeline,
    });
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "LEDGER_TIMELINE_MISSING_EVENT"), true);
    assert.equal(result.findings.some((finding) => finding.code === "LEDGER_TIMELINE_LENGTH_MISMATCH"), true);
});
(0, node_test_1.test)("timeline JSONL verification reports parse errors and deterministic summary", async () => {
    const tempDir = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "rgpt-ledger-integrity-"));
    try {
        const filePath = (0, node_path_1.join)(tempDir, "runtime-timeline.jsonl");
        const ledger = buildLedgerWithValidStream();
        const timeline = ledger.timelineSnapshot();
        await (0, promises_1.writeFile)(filePath, `${JSON.stringify(timeline[0])}\nnot_json\n${JSON.stringify(timeline[1])}\n`, "utf8");
        const result = await (0, ledger_integrity_verifier_1.verifyCanonicalTimelineJsonlFile)(filePath);
        assert.equal(result.summary.status, "invalid");
        assert.equal(result.findings.some((finding) => finding.code === "JSONL_PARSE_ERROR"), true);
        const summaryText = (0, ledger_integrity_verifier_1.formatLedgerIntegritySummary)(result);
        assert.equal(summaryText.includes("status=invalid"), true);
        assert.equal(summaryText.includes("records=2"), true);
    }
    finally {
        await (0, promises_1.rm)(tempDir, { recursive: true, force: true });
    }
});
