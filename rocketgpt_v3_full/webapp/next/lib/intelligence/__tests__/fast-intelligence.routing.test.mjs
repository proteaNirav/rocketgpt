import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFastWorkflowPlan,
  clearIntelligenceCache,
  getCatsCapabilityIndexSummary,
} from "../fast-intelligence.mjs";
import { clearOverrides, setOverride } from "../overrides-store.mjs";

test("buildFastWorkflowPlan selects CAT nodes for governance prompt", () => {
  clearIntelligenceCache();
  const result = buildFastWorkflowPlan({
    prompt: "Validate policy approvals and governance checks for this workflow.",
    tenantId: "tenant-a",
    messages: [{ role: "user", content: "Validate policy approvals and governance checks." }],
  });

  assert.ok(result.workflowPlan.nodes.length >= 1);
  assert.equal(typeof result.workflowPlan.planId, "string");
  assert.equal(result.telemetry.cache_hit, false);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
});

test("buildFastWorkflowPlan requires research for current external asks with weak CAT match", () => {
  clearIntelligenceCache();
  const result = buildFastWorkflowPlan({
    prompt: "Give latest market price and current regulation changes across countries.",
    tenantId: "tenant-b",
    messages: [{ role: "user", content: "latest market price and regulation changes" }],
  });

  assert.equal(result.requiresResearch, true);
  assert.equal(result.workflowPlan.requiresResearch, true);
});

test("buildFastWorkflowPlan uses 15 minute cache key behavior", () => {
  clearIntelligenceCache();
  const first = buildFastWorkflowPlan({
    prompt: "Create a policy validator workflow plan",
    tenantId: "tenant-cache",
    messages: [{ role: "user", content: "Create a policy validator workflow plan" }],
  });
  const second = buildFastWorkflowPlan({
    prompt: "Create a policy validator workflow plan",
    tenantId: "tenant-cache",
    messages: [{ role: "user", content: "Create a policy validator workflow plan" }],
  });

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(second.telemetry.cache_hit, true);
  assert.equal(first.workflowPlan.planId, second.workflowPlan.planId);
});

test("cats capability summary exposes stable version", () => {
  const summary = getCatsCapabilityIndexSummary();
  assert.equal(typeof summary.version, "string");
  assert.ok(summary.version.length > 0);
  assert.ok(summary.totalCats >= 1);
});

test("cache key contract and telemetry fields stay stable for v1", () => {
  clearIntelligenceCache();
  clearOverrides("tenant-v1", "chat-v1");
  const prompt = "Validate policy approvals quickly.";
  const messages = [{ role: "user", content: prompt }];

  const first = buildFastWorkflowPlan({
    prompt,
    tenantId: "tenant-v1",
    chatId: "chat-v1",
    messages,
  });
  setOverride("tenant-v1", "chat-v1", { maxNodes: 1 });
  const second = buildFastWorkflowPlan({
    prompt,
    tenantId: "tenant-v1",
    chatId: "chat-v1",
    messages,
  });

  assert.equal(first.workflowPlan.planId, second.workflowPlan.planId);
  assert.equal(second.cacheHit, true);
  assert.equal(typeof second.telemetry.plan_latency_ms, "number");
  assert.equal(typeof second.telemetry.cache_hit, "boolean");
  assert.equal(typeof second.telemetry.cats_selected_count, "number");
  assert.equal(typeof second.telemetry.confidence, "number");
  assert.equal(typeof second.telemetry.requiresResearch, "boolean");
  assert.equal(typeof second.telemetry.cats_index_version, "string");
});
