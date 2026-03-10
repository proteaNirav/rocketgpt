import test from "node:test";
import assert from "node:assert/strict";
import { buildFastWorkflowPlan, clearIntelligenceCache } from "../fast-intelligence.mjs";
import { clearOverrides, getOverrides, setOverride } from "../overrides-store.mjs";
import {
  buildOverrideDiffPreview,
  createPromotionProposal,
  listPromotionProposals,
} from "../promotion-store.mjs";

const tenantId = "tenant-session-test";
const chatA = "chat-a";
const chatB = "chat-b";

function reset() {
  clearIntelligenceCache();
  clearOverrides(tenantId, chatA);
  clearOverrides(tenantId, chatB);
}

test("overrides are chat/session isolated", () => {
  reset();
  setOverride(tenantId, chatA, { maxNodes: 1 });
  const a = getOverrides(tenantId, chatA);
  const b = getOverrides(tenantId, chatB);
  assert.ok(a);
  assert.equal(a.maxNodes, 1);
  assert.equal(b, null);
});

test("simulate failing CAT reroutes only within same chat", () => {
  reset();
  const prompt = "Run policy validator and governance checks.";
  const baseA = buildFastWorkflowPlan({
    prompt,
    tenantId,
    chatId: chatA,
    messages: [{ role: "user", content: prompt }],
  });
  assert.ok(baseA.workflowPlan.nodes.length >= 1);
  const failed = baseA.workflowPlan.nodes[0].catId;

  setOverride(tenantId, chatA, { avoidCatIds: [failed] });

  const reroutedA = buildFastWorkflowPlan({
    prompt,
    tenantId,
    chatId: chatA,
    messages: [{ role: "user", content: prompt }],
  });

  const baseB = buildFastWorkflowPlan({
    prompt,
    tenantId,
    chatId: chatB,
    messages: [{ role: "user", content: prompt }],
  });

  assert.ok(reroutedA.workflowPlan.nodes.every((n) => n.catId !== failed));
  assert.ok(baseB.workflowPlan.nodes.some((n) => n.catId === failed));
});

test("timeout downgrade override forces DEEP->FAST per chat", () => {
  reset();
  setOverride(tenantId, chatA, { forceFastUntilMs: Date.now() + 60_000, timeoutDowngradeApplied: true });
  const result = buildFastWorkflowPlan({
    prompt: "Need latest market regulation news now",
    tenantId,
    chatId: chatA,
    messages: [{ role: "user", content: "Need latest market regulation news now" }],
    timeoutMs: 2500,
  });
  assert.equal(result.workflowPlan.requiresResearch, false);
  assert.equal(result.telemetry.override_hit, true);
  assert.equal(result.telemetry.fallback_applied, true);
});

test("promotion is explicit and versioned", () => {
  reset();
  setOverride(tenantId, chatA, {
    avoidCatIds: ["RGPT-CAT-01"],
    maxNodes: 2,
    scoringWeights: { question: 0.2, cat: 0.5, workflow: 0.2, platform: 0.1 },
  });
  const overrides = getOverrides(tenantId, chatA);
  assert.ok(overrides);
  const beforeCount = listPromotionProposals().length;
  const diffPreview = buildOverrideDiffPreview(overrides);
  const created = createPromotionProposal({
    tenantId,
    chatId: chatA,
    createdBy: "admin-test",
    reason: "Promote proven session override",
    diffPreview,
  });
  const after = listPromotionProposals();
  assert.equal(after.length, beforeCount + 1);
  assert.equal(created.proposalVersion, 1);
  assert.equal(created.governance.approvalRequired, true);
});

test("overrides expire by TTL and remain session-isolated", async () => {
  reset();
  setOverride(tenantId, chatA, { maxNodes: 1 }, 25);
  setOverride(tenantId, chatB, { maxNodes: 2 }, 5_000);
  assert.equal(getOverrides(tenantId, chatA)?.maxNodes, 1);
  assert.equal(getOverrides(tenantId, chatB)?.maxNodes, 2);

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(getOverrides(tenantId, chatA), null);
  assert.equal(getOverrides(tenantId, chatB)?.maxNodes, 2);
});
