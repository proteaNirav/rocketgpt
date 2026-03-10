import test from "node:test";
import assert from "node:assert/strict";

import {
  JOB_TYPES,
  clearQueueForTests,
  claimNext,
  enqueue,
  getJob,
  markDone,
  markFailed,
} from "../queue.mjs";

test("enqueue -> claim -> markDone lifecycle", () => {
  clearQueueForTests();
  const queued = enqueue(JOB_TYPES.CAT_RUN, { catId: "RGPT-CAT-01" });
  assert.equal(typeof queued.runId, "string");
  assert.equal(queued.status, "queued");

  const claimed = claimNext(JOB_TYPES.CAT_RUN, { workerId: "test-worker" });
  assert.ok(claimed);
  assert.equal(claimed.runId, queued.runId);
  assert.equal(claimed.status, "processing");
  assert.equal(claimed.attempts, 1);

  const done = markDone(queued.runId, { ok: true });
  assert.equal(done.status, "done");
  assert.equal(done.result.ok, true);
  assert.equal(typeof done.telemetry.queue_depth, "number");
  assert.equal(typeof done.telemetry.job_latency_ms, "number");

  const job = getJob(queued.runId);
  assert.ok(job);
  assert.equal(job.status, "done");
  assert.equal(job.result.ok, true);
});

test("markFailed retries once then final fail", () => {
  clearQueueForTests();
  const queued = enqueue(JOB_TYPES.WORKFLOW_RUN, { workflowId: "wf-1" }, { maxRetries: 1 });

  const firstClaim = claimNext(JOB_TYPES.WORKFLOW_RUN, { workerId: "test-worker" });
  assert.ok(firstClaim);
  const firstFail = markFailed(queued.runId, "transient", { retryDelayMs: 0 });
  assert.equal(firstFail.status, "queued");
  assert.equal(firstFail.retryScheduled, true);

  const secondClaim = claimNext(JOB_TYPES.WORKFLOW_RUN, { workerId: "test-worker" });
  assert.ok(secondClaim);
  assert.equal(secondClaim.attempts, 2);
  const secondFail = markFailed(queued.runId, "fatal", { retryDelayMs: 0 });
  assert.equal(secondFail.status, "failed");
  assert.equal(secondFail.retryScheduled, false);

  const job = getJob(queued.runId);
  assert.ok(job);
  assert.equal(job.status, "failed");
  assert.match(String(job.error), /fatal/);
});

