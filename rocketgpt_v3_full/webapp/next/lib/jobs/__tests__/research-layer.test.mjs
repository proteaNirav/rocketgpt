import test from "node:test";
import assert from "node:assert/strict";

import { JOB_TYPES, clearQueueForTests, enqueue } from "../queue.mjs";
import {
  buildEvidencePack,
  clearResearchStoreForTests,
  getEvidencePackByPlanId,
  makeResearchCacheKey,
} from "../research-layer.mjs";
import { runWorkerLoop } from "../worker.mjs";

test("research cache key is stable and cache hit reuses pack", () => {
  clearResearchStoreForTests();
  const keyA = makeResearchCacheKey({
    query: "vendor due diligence",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
  });
  const keyB = makeResearchCacheKey({
    query: "vendor due diligence",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
  });
  assert.equal(keyA, keyB);

  const first = buildEvidencePack({
    planId: "plan-r1",
    query: "vendor due diligence",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
  });
  const second = buildEvidencePack({
    planId: "plan-r2",
    query: "vendor due diligence",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
  });
  assert.equal(first.pack_id, second.pack_id);
  assert.equal(second.cache_hit, true);
});

test("research layer enforces source caps and supports partial output", () => {
  clearResearchStoreForTests();
  const pack = buildEvidencePack({
    planId: "plan-cap",
    query: "policy controls",
    sourceCap: 99,
    timeboxMs: 1,
  });
  assert.ok(pack.source_cap <= 12);
  assert.ok(pack.source_cap >= 8);
  assert.ok(Array.isArray(pack.evidence_refs));
  assert.ok(pack.evidence_refs.length <= pack.source_cap);
  assert.equal(typeof pack.partial, "boolean");
});

test("async research job persists EvidencePack linked to plan", async () => {
  clearQueueForTests();
  clearResearchStoreForTests();
  const queued = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
    planId: "plan-async-1",
    query: "latest compliance controls",
    scope: "chat",
    recencyWindow: "14d",
    allowlistVersion: "v1",
    sourceCap: 10,
    timeboxMs: 300,
  });
  const worker = await runWorkerLoop({
    workerId: "research-test-worker",
    jobTypes: [JOB_TYPES.RESEARCH_PACK_BUILD],
    pollMs: 10,
    idleExitMs: 200,
    maxIterations: 30,
  });
  assert.ok(worker.processed >= 1);
  const linked = getEvidencePackByPlanId("plan-async-1");
  assert.ok(linked);
  assert.equal(linked.plan_id, "plan-async-1");
  assert.ok(Array.isArray(linked.evidence_refs));
  assert.ok(linked.evidence_refs.length >= 1);
  assert.equal(typeof queued.runId, "string");
});

