import test from "node:test";
import assert from "node:assert/strict";

import { JOB_TYPES, clearQueueForTests, enqueue, getJob } from "../queue.mjs";
import { readTimelineEvents } from "../timeline.mjs";
import { runWorkerLoop } from "../worker.mjs";

test("workflow timeline emits progressive events for run", async () => {
  clearQueueForTests();
  const queued = enqueue(JOB_TYPES.WORKFLOW_RUN, {
    planId: "plan_demo_1",
    requiresResearch: true,
    fallbackApplied: true,
    nodes: [
      { nodeId: "node-1", catId: "RGPT-CAT-01" },
      { nodeId: "node-2", catId: "RGPT-CAT-02" },
    ],
  }, { maxRetries: 0 });

  const worker = await runWorkerLoop({
    workerId: "timeline-test",
    jobTypes: [JOB_TYPES.WORKFLOW_RUN, JOB_TYPES.CAT_RUN],
    pollMs: 10,
    idleExitMs: 300,
    maxIterations: 100,
  });
  assert.ok(worker.processed >= 2);

  const job = getJob(queued.runId);
  assert.ok(job);
  const events = readTimelineEvents(queued.runId, { afterSeq: 0, limit: 200 });
  const types = events.map((e) => e.type);
  assert.ok(types.includes("PLAN_CREATED"));
  assert.ok(types.includes("NODE_STARTED"));
  assert.ok(types.includes("NODE_DONE"));
  assert.ok(types.includes("FALLBACK_APPLIED"));
});
