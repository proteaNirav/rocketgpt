import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ExecutionLedger } from "../runtime/execution-ledger";

test("benchmark: canonical timeline append for 2000 hot-path events stays under 900ms", () => {
  const ledger = new ExecutionLedger("");
  const t0 = performance.now();
  for (let i = 0; i < 2000; i += 1) {
    ledger.append({
      category: i % 4 === 0 ? "dispatch" : i % 4 === 1 ? "runtime" : i % 4 === 2 ? "execution" : "side_effect",
      eventType:
        i % 4 === 0
          ? "dispatch.guard.evaluated"
          : i % 4 === 1
            ? "runtime.guard.evaluated"
            : i % 4 === 2
              ? "execution.completed"
              : "side_effect.completed",
      action: "bench_action",
      source: "bench_source",
      target: "bench_target",
      ids: {
        requestId: "req-bench",
        executionId: "exec-bench",
        correlationId: "req-bench",
        sessionId: "session-bench",
      },
      mode: "normal",
      status: i % 4 === 2 ? "completed" : i % 4 === 3 ? "completed" : "evaluated",
      metadata: { idx: i },
    });
  }
  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 900, `canonical append elapsed ${elapsedMs.toFixed(2)}ms exceeds 900ms`);
  const timeline = ledger.timelineSnapshot();
  assert.equal(timeline.length, 2000);
});
