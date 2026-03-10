import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { StopQueueManager } from "../../../src/core/cognitive-mesh/runtime/messaging/stop-queue-manager";
import type { CognitiveParcel } from "../../../src/core/cognitive-mesh/runtime/messaging/types/parcel";

function buildParcel(idx: number): CognitiveParcel {
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

test("benchmark: stop queue dequeue throughput for 2000 parcels", () => {
  const manager = new StopQueueManager();
  const stopId = "cat-hub";
  for (let i = 0; i < 2000; i += 1) {
    manager.enqueueParcel(stopId, buildParcel(i));
  }

  const t0 = performance.now();
  const picked = manager.dequeueEligibleParcels(stopId, 1000, {
    allowedSensitivity: new Set(["internal"]),
    maxRetryCount: 3,
  });
  const elapsedMs = performance.now() - t0;

  assert.equal(picked.length, 1000);
  assert.ok(elapsedMs < 500, `dequeue elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
});
