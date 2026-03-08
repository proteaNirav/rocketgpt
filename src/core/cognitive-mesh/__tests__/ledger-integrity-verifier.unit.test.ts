import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ExecutionLedger } from "../runtime/execution-ledger";
import {
  formatLedgerIntegritySummary,
  verifyCanonicalTimelineJsonlFile,
  verifyLedgerIntegrity,
} from "../runtime/ledger-integrity-verifier";

function buildLedgerWithValidStream(): ExecutionLedger {
  const ledger = new ExecutionLedger("", "");
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

test("ledger integrity verifier passes valid canonical timeline chain", () => {
  const ledger = buildLedgerWithValidStream();
  const result = verifyLedgerIntegrity({
    timelineEvents: ledger.timelineSnapshot(),
    ledgerEntries: ledger.snapshot(),
  });
  assert.equal(result.summary.status, "valid");
  assert.equal(result.summary.errorCount, 0);
  assert.equal(result.summary.warningCount, 0);
});

test("execution ledger exposes integrity verification signals for non-valid states", () => {
  const ledger = new ExecutionLedger("", "");
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

test("ledger integrity verifier detects broken prev hash chain", () => {
  const ledger = buildLedgerWithValidStream();
  const timeline = ledger.timelineSnapshot();
  const tampered = timeline.map((event) => ({ ...event, integrity: { ...event.integrity } }));
  if (tampered[2]) {
    tampered[2].integrity.prevEventHash = "broken_prev_hash";
  }
  const result = verifyLedgerIntegrity({ timelineEvents: tampered });
  assert.equal(result.summary.status, "invalid");
  assert.equal(result.findings.some((finding) => finding.code === "CHAIN_PREV_HASH_MISMATCH"), true);
});

test("ledger integrity verifier detects hash mismatch and stable identity mismatch", () => {
  const ledger = buildLedgerWithValidStream();
  const tampered = ledger.timelineSnapshot().map((event) => ({
    ...event,
    integrity: { ...event.integrity },
  }));
  if (tampered[1]) {
    tampered[1].action = "tampered_action";
    tampered[1].integrity.eventHash = "tampered_hash";
  }
  const result = verifyLedgerIntegrity({ timelineEvents: tampered });
  assert.equal(result.summary.status, "invalid");
  assert.equal(result.findings.some((finding) => finding.code === "CHAIN_EVENT_HASH_MISMATCH"), true);
  assert.equal(result.findings.some((finding) => finding.code === "STABLE_IDENTITY_MISMATCH"), true);
});

test("ledger integrity verifier detects sequence disorder deterministically", () => {
  const ledger = buildLedgerWithValidStream();
  const timeline = ledger.timelineSnapshot();
  const tampered = timeline.map((event) => ({ ...event, integrity: { ...event.integrity } }));
  if (tampered[0]) {
    tampered[0].sequenceNo = 2;
  }
  if (tampered[1]) {
    tampered[1].sequenceNo = 1;
  }
  const result = verifyLedgerIntegrity({ timelineEvents: tampered });
  assert.equal(result.summary.status, "invalid");
  assert.equal(
    result.findings.some((finding) =>
      finding.code === "SEQUENCE_OUT_OF_ORDER" ||
      finding.code === "SEQUENCE_GAP" ||
      finding.code === "SEQUENCE_DUPLICATE" ||
      finding.code === "SEQUENCE_START_INVALID"
    ),
    true
  );
});

test("ledger integrity verifier detects missing required fields", () => {
  const ledger = buildLedgerWithValidStream();
  const tampered = ledger.timelineSnapshot().map((event) => ({
    ...event,
    integrity: { ...event.integrity },
  }));
  if (tampered[0]) {
    tampered[0].eventId = "";
  }
  const result = verifyLedgerIntegrity({ timelineEvents: tampered });
  assert.equal(result.summary.status, "invalid");
  assert.equal(result.findings.some((finding) => finding.code === "STRUCTURE_MISSING_REQUIRED_FIELD"), true);
});

test("ledger integrity verifier returns partial when timeline is derived from ledger only", () => {
  const ledger = buildLedgerWithValidStream();
  const result = verifyLedgerIntegrity({ ledgerEntries: ledger.snapshot() });
  assert.equal(result.summary.status, "partial");
  assert.equal(result.summary.partial, true);
  assert.equal(
    result.findings.some((finding) => finding.code === "PARTIAL_VERIFICATION_TIMELINE_DERIVED"),
    true
  );
});

test("ledger and timeline mismatch is reported deterministically", () => {
  const ledger = buildLedgerWithValidStream();
  const timeline = ledger.timelineSnapshot().map((event) => ({
    ...event,
    integrity: { ...event.integrity },
  }));
  timeline.pop();
  const result = verifyLedgerIntegrity({
    ledgerEntries: ledger.snapshot(),
    timelineEvents: timeline,
  });
  assert.equal(result.summary.status, "invalid");
  assert.equal(result.findings.some((finding) => finding.code === "LEDGER_TIMELINE_MISSING_EVENT"), true);
  assert.equal(result.findings.some((finding) => finding.code === "LEDGER_TIMELINE_LENGTH_MISMATCH"), true);
});

test("timeline JSONL verification reports parse errors and deterministic summary", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "rgpt-ledger-integrity-"));
  try {
    const filePath = join(tempDir, "runtime-timeline.jsonl");
    const ledger = buildLedgerWithValidStream();
    const timeline = ledger.timelineSnapshot();
    await writeFile(
      filePath,
      `${JSON.stringify(timeline[0])}\nnot_json\n${JSON.stringify(timeline[1])}\n`,
      "utf8"
    );
    const result = await verifyCanonicalTimelineJsonlFile(filePath);
    assert.equal(result.summary.status, "invalid");
    assert.equal(result.findings.some((finding) => finding.code === "JSONL_PARSE_ERROR"), true);
    const summaryText = formatLedgerIntegritySummary(result);
    assert.equal(summaryText.includes("status=invalid"), true);
    assert.equal(summaryText.includes("records=2"), true);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
