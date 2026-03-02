import assert from "assert";

import { applyContainmentDecision } from "../../lib/governance/containment-engine";
import { aggregateWeeklyDigest } from "../../lib/governance/digest-aggregate";
import { evaluatePolicyRules, DEFAULT_GOVERNANCE_RULES } from "../../lib/governance/policy-engine";
import { createParamsFingerprint, redactSecrets } from "../../lib/governance/redaction";
import { computeCrpsSignature } from "../../lib/governance/risk-scoring";
import type { WorkflowNode } from "../../lib/workflow-types";

function sampleNode(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    node_id: "n1",
    cat_id: "CAT-A",
    canonical_name: "cats/security/a",
    name: "Security Guard",
    purpose: "Protect policy boundaries",
    allowed_side_effects: ["workflow_dispatch"],
    requires_approval: true,
    passport_required: true,
    selection_reason: "risk-first",
    score: 80,
    init_params: {},
    expected_behavior: "Validate and dispatch",
    expected_outputs: [],
    ...overrides,
  };
}

function testCrpsDeterministic() {
  const nodesA = [sampleNode({ cat_id: "CAT-2", node_id: "2" }), sampleNode({ cat_id: "CAT-1", node_id: "1" })];
  const nodesB = [sampleNode({ cat_id: "CAT-1", node_id: "1" }), sampleNode({ cat_id: "CAT-2", node_id: "2" })];
  const paramsA = { alpha: 1, zeta: 2, nested: { token: "secret" } };
  const paramsB = { zeta: 2, nested: { token: "secret" }, alpha: 1 };

  const crpsA = computeCrpsSignature({ workflowId: "wf-1", nodes: nodesA, params: paramsA });
  const crpsB = computeCrpsSignature({ workflowId: "wf-1", nodes: nodesB, params: paramsB });
  assert.strictEqual(crpsA.crpsId, crpsB.crpsId, "CRPS hash must be deterministic across ordering.");
}

function testPolicyTrigger() {
  const crps = computeCrpsSignature({
    workflowId: "wf-2",
    nodes: [sampleNode({ purpose: "legal security incident response", allowed_side_effects: ["workflow_dispatch"] })],
    params: { force: true },
  });
  const decision = evaluatePolicyRules(DEFAULT_GOVERNANCE_RULES, crps, {
    repeatCount: 1,
    redLineMatch: false,
    approvalsMissing: true,
    simulationMissing: false,
  });
  assert.ok(decision.containmentLevel >= 2, "Expected L2+ containment for high-risk policy conditions.");
}

function testContainmentTransitions() {
  const l1 = applyContainmentDecision({
    matchedRuleId: "l1",
    matchedRuleName: "L1",
    containmentLevel: 1,
    explanation: "L1",
    action: {
      level: 1,
      explainTemplate: "L1",
      requireSimulationReport: true,
      blockExecution: false,
      requireApprovalCheckpoint: false,
      disableAutoExec: false,
      silent: true,
    },
  });
  const l3 = applyContainmentDecision({
    matchedRuleId: "l3",
    matchedRuleName: "L3",
    containmentLevel: 3,
    explanation: "L3",
    action: {
      level: 3,
      explainTemplate: "L3",
      requireSimulationReport: true,
      blockExecution: true,
      requireApprovalCheckpoint: true,
      disableAutoExec: true,
      silent: false,
    },
  });
  assert.strictEqual(l1.allowExecution, true, "L1 should allow execution.");
  assert.strictEqual(l3.allowExecution, false, "L3 should block execution.");
  assert.strictEqual(l3.blockExecution, true, "L3 must block execution.");
}

function testRedactionUtility() {
  const raw = {
    password: "abc",
    nested: { apiKey: "key", token: "t", safe: "ok" },
    safe: "value",
  };
  const redacted = redactSecrets(raw) as any;
  assert.strictEqual(redacted.password, "[REDACTED]");
  assert.strictEqual(redacted.nested.apiKey, "[REDACTED]");
  assert.strictEqual(redacted.nested.safe, "ok");

  const fp1 = createParamsFingerprint(raw as any);
  const fp2 = createParamsFingerprint({ safe: "value", nested: { safe: "ok", token: "t", apiKey: "key" }, password: "abc" });
  assert.strictEqual(fp1, fp2, "Fingerprint must stay stable across key order.");
}

function testWeeklyDigestShape() {
  const digest = aggregateWeeklyDigest(
    [
      { crps_id: "a", workflow_id: "wf", risk_domains: ["security"] },
      { crps_id: "a", workflow_id: "wf", risk_domains: ["security"] },
      { crps_id: "b", workflow_id: "wf2", risk_domains: ["legal"] },
    ],
    [{ id: "e1", containment_level: 2, workflow_id: "wf", crps_id: "a", created_at: new Date().toISOString(), explanation: "x" }],
    "2026-03-01T00:00:00.000Z",
    "2026-03-07T23:59:59.999Z"
  );
  assert.ok(Array.isArray(digest.topPatterns), "Digest topPatterns should be an array.");
  assert.ok(Array.isArray(digest.policyAdjustmentProposals), "Digest proposals should be an array.");
  assert.ok(typeof digest.id === "string" && digest.id.length > 0, "Digest should have an id.");
}

function runAll() {
  testCrpsDeterministic();
  testPolicyTrigger();
  testContainmentTransitions();
  testRedactionUtility();
  testWeeklyDigestShape();
  console.log("governance unit tests: PASS");
}

runAll();
