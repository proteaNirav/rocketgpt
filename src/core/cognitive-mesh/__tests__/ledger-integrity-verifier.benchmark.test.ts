import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { verifyLedgerIntegrity } from "../runtime/ledger-integrity-verifier";

test("benchmark: integrity verification for 2000 canonical timeline events stays under 900ms", () => {
  const ledger = new ExecutionLedger("", "");
  for (let i = 0; i < 2000; i += 1) {
    ledger.append({
      category: i % 4 === 0 ? "dispatch" : i % 4 === 1 ? "runtime" : i % 4 === 2 ? "execution" : "side_effect",
      eventType:
        i % 4 === 0
          ? "dispatch.guard.evaluated"
          : i % 4 === 1
            ? "runtime.guard.evaluated"
            : i % 4 === 2
              ? "execution.started"
              : "side_effect.completed",
      action: `benchmark_${i}`,
      source: "benchmark_source",
      target: "benchmark_target",
      ids: {
        executionId: "exec-bench-integrity",
        requestId: "req-bench-integrity",
        correlationId: "req-bench-integrity",
      },
      mode: "normal",
      status: i % 4 === 2 ? "started" : i % 4 === 3 ? "completed" : "evaluated",
      metadata: { idx: i },
    });
  }

  const t0 = performance.now();
  const result = verifyLedgerIntegrity({
    ledgerEntries: ledger.snapshot(),
    timelineEvents: ledger.timelineSnapshot(),
  });
  const elapsedMs = performance.now() - t0;
  assert.equal(result.summary.status, "valid");
  assert.ok(elapsedMs < 900, `integrity verification elapsed ${elapsedMs.toFixed(2)}ms exceeds 900ms`);
});
