import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { PriorityQueue } from "../priority/priority-queue";
import type { PriorityDecision } from "../priority/priority-types";

test("benchmark: priority queue enqueue/dequeue throughput smoke", () => {
  const queue = new PriorityQueue<{ id: string }>();
  const classes: PriorityDecision["queueClass"][] = ["p0", "p1", "p2", "p3"];
  const t0 = performance.now();

  for (let i = 0; i < 2_000; i += 1) {
    const queueClass = classes[i % classes.length];
    queue.enqueue(
      { id: `item-${i}` },
      {
        id: `item-${i}`,
        priorityScore: 100 - (i % 100),
        queueClass,
        reasons: [],
        computedAtTs: Date.now(),
      }
    );
  }

  let drained = 0;
  while (queue.dequeue()) {
    drained += 1;
  }
  const elapsedMs = performance.now() - t0;

  assert.equal(drained, 2_000);
  // Non-blocking benchmark signal: correctness is asserted above; elapsed is diagnostic only.
  assert.ok(elapsedMs >= 0);
});
