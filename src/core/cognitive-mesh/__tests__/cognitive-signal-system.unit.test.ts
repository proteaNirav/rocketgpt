import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  createRuntimeSignal,
  deriveCapabilitySignals,
  deriveDriftSignals,
  deriveIntegritySignals,
  summarizeSignalTypes,
} from "../runtime/cognitive-signal-system";
import type { CapabilityVerificationOutcome } from "../capabilities/orchestration/capability-verification";
import type { LedgerIntegrityVerificationResult } from "../runtime/ledger-integrity-verifier";
import type { SideEffectDriftResult } from "../runtime/side-effect-drift-detector";

function verification(decision: CapabilityVerificationOutcome["decision"], adoptable: boolean): CapabilityVerificationOutcome {
  return {
    decision,
    adoptable,
    reasonCodes: decision === "accepted" ? [] : ["RESULT_DIAGNOSTICS_INVALID"],
    warnings: decision === "accepted_with_warnings" ? ["warning"] : [],
    normalizedStatus: adoptable ? "success" : "failed",
  };
}

test("cognitive signal system generates deterministic ids for equivalent signals", () => {
  const first = createRuntimeSignal({
    signalType: "execution_ok",
    category: "execution",
    source: "unit",
    severity: "info",
    ids: { requestId: "req-1", sessionId: "sess-1" },
    capabilityId: "cap.language.v1",
    reasonCodes: ["ok"],
  });
  const second = createRuntimeSignal({
    signalType: "execution_ok",
    category: "execution",
    source: "unit",
    severity: "info",
    ids: { requestId: "req-1", sessionId: "sess-1" },
    capabilityId: "cap.language.v1",
    reasonCodes: ["ok"],
  });

  assert.equal(first.signalId, second.signalId);
  assert.equal(first.stableIdentity, second.stableIdentity);
});

test("capability signal derivation emits baseline success and adoption candidates", () => {
  const signals = deriveCapabilitySignals({
    source: "unit",
    ids: { requestId: "req-success", sessionId: "sess-success" },
    capabilityId: "cap.language.v1",
    capabilityStatus: "success",
    capabilityVerification: verification("accepted", true),
    shouldCommit: true,
    verificationRequired: false,
    governanceIssues: [],
  });

  const types = summarizeSignalTypes(signals);
  assert.equal(types.includes("execution_ok"), true);
  assert.equal(types.includes("memory_candidate"), true);
  assert.equal(types.includes("experience_candidate"), true);
});

test("capability signal derivation emits degraded and warning/rejection signals deterministically", () => {
  const degraded = deriveCapabilitySignals({
    source: "unit",
    ids: { requestId: "req-degraded", sessionId: "sess-degraded" },
    capabilityId: "cap.retrieval.v1",
    capabilityStatus: "degraded_success",
    capabilityVerification: verification("degraded_accepted", true),
    runtimeGuardOutcome: "degraded_allow",
    shouldCommit: false,
    verificationRequired: true,
    governanceIssues: [],
  });
  assert.equal(summarizeSignalTypes(degraded).includes("degraded_execution"), true);

  const rejected = deriveCapabilitySignals({
    source: "unit",
    ids: { requestId: "req-reject", sessionId: "sess-reject" },
    capabilityId: "cap.language.v1",
    capabilityStatus: "success",
    capabilityVerification: verification("invalid_result", false),
    shouldCommit: false,
    verificationRequired: false,
    governanceIssues: [],
  });
  const rejectedTypes = summarizeSignalTypes(rejected);
  assert.equal(rejectedTypes.includes("verification_rejected"), true);
  assert.equal(rejectedTypes.includes("adoption_suppressed"), true);
});

test("guard and dispatch outcomes map to canonical signals", () => {
  const signals = deriveCapabilitySignals({
    source: "unit",
    ids: { requestId: "req-guard", sessionId: "sess-guard" },
    capabilityId: "cap.language.v1",
    capabilityStatus: "blocked",
    capabilityVerification: verification("policy_rejected", false),
    runtimeGuardOutcome: "safe_mode_redirect",
    dispatchGuardOutcome: "reroute",
    shouldCommit: false,
    verificationRequired: false,
    governanceIssues: [],
  });
  const types = summarizeSignalTypes(signals);
  assert.equal(types.includes("guard_block"), true);
  assert.equal(types.includes("safe_mode_redirect"), true);
  assert.equal(types.includes("dispatch_reroute"), true);
});

test("integrity and drift findings convert to canonical warning signals", () => {
  const integrity: LedgerIntegrityVerificationResult = {
    summary: {
      status: "invalid",
      streamCount: 1,
      recordCount: 2,
      validRecordCount: 1,
      invalidRecordCount: 1,
      warningCount: 1,
      errorCount: 1,
      partial: false,
    },
    findings: [
      {
        code: "CHAIN_EVENT_HASH_MISMATCH",
        severity: "error",
        scope: "record",
        message: "hash mismatch",
      },
    ],
    streamStats: [],
  };
  const drift: SideEffectDriftResult = {
    summary: {
      status: "drift_detected",
      streamCount: 1,
      recordCount: 1,
      sideEffectIntentCount: 1,
      sideEffectCompletionCount: 0,
      matchedSideEffectCount: 0,
      unmatchedIntentCount: 1,
      unmatchedCompletionCount: 0,
      driftFindingCount: 1,
      warningCount: 0,
      partial: false,
      integrityStatus: "invalid",
    },
    findings: [
      {
        code: "INTENT_WITHOUT_COMPLETION",
        severity: "high",
        scope: "side_effect",
        message: "missing completion",
      },
    ],
    streamStats: [],
    integrity,
  };

  const integritySignals = deriveIntegritySignals(integrity, { executionId: "exec-1" }, "unit_integrity");
  const driftSignals = deriveDriftSignals(drift, { executionId: "exec-1" }, "unit_drift");

  assert.equal(integritySignals.length, 1);
  assert.equal(integritySignals[0]?.signalType, "integrity_warning");
  assert.equal(driftSignals.length, 1);
  assert.equal(driftSignals[0]?.signalType, "drift_detected");
});
