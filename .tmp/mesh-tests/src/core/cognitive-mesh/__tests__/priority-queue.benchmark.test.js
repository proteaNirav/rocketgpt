"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const priority_queue_1 = require("../priority/priority-queue");
(0, node_test_1.test)("benchmark: priority queue enqueue/dequeue throughput smoke", () => {
    const queue = new priority_queue_1.PriorityQueue();
    const classes = ["p0", "p1", "p2", "p3"];
    const t0 = node_perf_hooks_1.performance.now();
    for (let i = 0; i < 2000; i += 1) {
        const queueClass = classes[i % classes.length];
        queue.enqueue({ id: `item-${i}` }, {
            id: `item-${i}`,
            priorityScore: 100 - (i % 100),
            queueClass,
            reasons: [],
            computedAtTs: Date.now(),
        });
    }
    let drained = 0;
    while (queue.dequeue()) {
        drained += 1;
    }
    const elapsedMs = node_perf_hooks_1.performance.now() - t0;
    assert.equal(drained, 2000);
    // Non-blocking benchmark signal: correctness is asserted above; elapsed is diagnostic only.
    assert.ok(elapsedMs >= 0);
});
