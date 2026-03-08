"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const stop_queue_manager_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/stop-queue-manager");
function buildParcel(idx) {
    const now = new Date().toISOString();
    return {
        parcelId: `parcel-${idx}`,
        sessionId: "bench-session",
        sourceNodeId: "cat-hub",
        sourceNodeClass: "cat",
        targetNodeId: "librarian-hub",
        targetNodeClass: "librarian",
        intent: "index",
        eventType: "benchmark.event",
        payload: { idx },
        profile: {
            sizeClass: "small",
            sensitivity: "internal",
            replayable: true,
            requiresChainOfCustody: false,
        },
        priority: "normal",
        createdAt: now,
        updatedAt: now,
    };
}
(0, node_test_1.test)("benchmark: stop queue dequeue throughput for 2000 parcels", () => {
    const manager = new stop_queue_manager_1.StopQueueManager();
    const stopId = "cat-hub";
    for (let i = 0; i < 2000; i += 1) {
        manager.enqueueParcel(stopId, buildParcel(i));
    }
    const t0 = node_perf_hooks_1.performance.now();
    const picked = manager.dequeueEligibleParcels(stopId, 1000, {
        allowedSensitivity: new Set(["internal"]),
        maxRetryCount: 3,
    });
    const elapsedMs = node_perf_hooks_1.performance.now() - t0;
    node_assert_1.strict.equal(picked.length, 1000);
    node_assert_1.strict.ok(elapsedMs < 500, `dequeue elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
});
