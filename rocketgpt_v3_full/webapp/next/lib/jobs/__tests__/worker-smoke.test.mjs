import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { JOB_TYPES, clearQueueForTests, enqueue, getJob } from "../queue.mjs";
import { runWorkerLoop } from "../worker.mjs";

test("smoke: enqueue research job and process with worker", async () => {
  clearQueueForTests();
  const queued = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
    topic: "vendor onboarding controls",
  });
  assert.equal(queued.status, "queued");

  const workerResult = await runWorkerLoop({
    workerId: "smoke-worker",
    jobTypes: [JOB_TYPES.RESEARCH_PACK_BUILD],
    pollMs: 20,
    idleExitMs: 120,
    maxIterations: 5,
  });
  assert.ok(workerResult.processed >= 1);

  const job = getJob(queued.runId);
  assert.ok(job);
  assert.equal(job.status, "done");
  assert.equal(typeof job.result.artifactPath, "string");
  assert.equal(fs.existsSync(job.result.artifactPath), true);
});

