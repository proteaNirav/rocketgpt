import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MemoryAdoptionService } from "../memory/memory-adoption-service";
import type { CapabilityVerificationOutcome } from "../capabilities/orchestration/capability-verification";
import type { CognitiveRuntimeSignal } from "../runtime/cognitive-signal-system";

function verification(decision: CapabilityVerificationOutcome["decision"], adoptable: boolean): CapabilityVerificationOutcome {
  return {
    decision,
    adoptable,
    reasonCodes: adoptable ? [] : ["RESULT_DIAGNOSTICS_INVALID"],
    warnings: decision === "accepted_with_warnings" ? ["verification_warning"] : [],
    normalizedStatus: adoptable ? "success" : "failed",
  };
}

function signal(signalType: CognitiveRuntimeSignal["signalType"]): CognitiveRuntimeSignal {
  return {
    schemaVersion: "rgpt.cognitive_signal.v1",
    signalId: `sig-${signalType}`,
    stableIdentity: `stable-${signalType}`,
    signalType,
    category: "execution",
    source: "unit",
    severity: "medium",
    priority: 50,
    timestamp: new Date().toISOString(),
    ids: { sessionId: "mem-adopt-session" },
    reasonCodes: [],
  };
}

test("memory adoption adopts valid verified success deterministically", () => {
  const service = new MemoryAdoptionService();
  const first = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-session",
    requestId: "req-mem-adopt",
    executionId: "exec-mem-adopt",
    capabilityId: "cap.language.v1",
    source: "mesh_live_runtime",
    resultStatus: "success",
    payload: { normalized: "hello" },
    capabilityVerification: verification("accepted", true),
    directCommitEligible: true,
  });
  const second = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-session",
    requestId: "req-mem-adopt",
    executionId: "exec-mem-adopt",
    capabilityId: "cap.language.v1",
    source: "mesh_live_runtime",
    resultStatus: "success",
    payload: { normalized: "hello" },
    capabilityVerification: verification("accepted", true),
    directCommitEligible: true,
  });

  assert.equal(first.decision, "adopted");
  assert.equal(first.adoptable, true);
  assert.equal(first.writeToWorkingMemory, true);
  assert.ok(first.memoryRecord);
  assert.equal(first.memoryRecord?.memoryId, second.memoryRecord?.memoryId);
});

test("memory adoption downgrades degraded success with quality markers", () => {
  const service = new MemoryAdoptionService();
  const result = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-degraded",
    requestId: "req-mem-degraded",
    executionId: "exec-mem-degraded",
    capabilityId: "cap.retrieval.v1",
    source: "mesh_live_runtime",
    resultStatus: "degraded_success",
    payload: { records: [] },
    capabilityVerification: verification("degraded_accepted", true),
    directCommitEligible: false,
    fallbackTriggered: true,
  });

  assert.equal(result.decision, "downgraded_adoption");
  assert.equal(result.quality, "degraded");
  assert.equal(result.writeToWorkingMemory, false);
  assert.equal(result.reasonCodes.includes("DEGRADED_RESULT_DOWNGRADED"), true);
  assert.equal(result.reasonCodes.includes("FALLBACK_RESULT_DOWNGRADED"), true);
});

test("memory adoption rejects non-adoptable and invalid candidates", () => {
  const service = new MemoryAdoptionService();
  const rejected = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-reject",
    requestId: "req-mem-reject",
    executionId: "exec-mem-reject",
    capabilityId: "cap.language.v1",
    source: "mesh_live_runtime",
    resultStatus: "failed",
    payload: { value: "x" },
    capabilityVerification: verification("rejected", false),
    directCommitEligible: false,
  });
  assert.equal(rejected.decision, "rejected");
  assert.equal(rejected.adoptable, false);

  const invalid = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-invalid",
    requestId: "req-mem-invalid",
    executionId: "exec-mem-invalid",
    capabilityId: "cap.language.v1",
    source: "mesh_live_runtime",
    resultStatus: "success",
    payload: undefined,
    directCommitEligible: true,
  });
  assert.equal(invalid.decision, "invalid_memory_candidate");
  assert.equal(invalid.reasonCodes.includes("CANDIDATE_STATUS_MISSING_PAYLOAD"), true);
});

test("memory adoption suppresses candidates when integrity/drift signals are present", () => {
  const service = new MemoryAdoptionService();
  const suppressed = service.evaluateCapabilityCandidate({
    sessionId: "mem-adopt-suppress",
    requestId: "req-mem-suppress",
    executionId: "exec-mem-suppress",
    capabilityId: "cap.language.v1",
    source: "mesh_live_runtime",
    resultStatus: "success",
    payload: { value: "ok" },
    capabilityVerification: verification("accepted", true),
    directCommitEligible: true,
    cognitiveSignals: [signal("integrity_warning"), signal("drift_detected")],
  });

  assert.equal(suppressed.decision, "suppressed");
  assert.equal(suppressed.adoptable, false);
  assert.equal(suppressed.reasonCodes.includes("INTEGRITY_RISK_SUPPRESSED"), true);
  assert.equal(suppressed.reasonCodes.includes("DRIFT_RISK_SUPPRESSED"), true);
});

