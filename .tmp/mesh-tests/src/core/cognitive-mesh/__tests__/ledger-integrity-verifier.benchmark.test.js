"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const execution_ledger_1 = require("../runtime/execution-ledger");
const ledger_integrity_verifier_1 = require("../runtime/ledger-integrity-verifier");
(0, node_test_1.test)("benchmark: integrity verification for 2000 canonical timeline events stays under 900ms", () => {
    const ledger = new execution_ledger_1.ExecutionLedger("", "");
    for (let i = 0; i < 2000; i += 1) {
        ledger.append({
            category: i % 4 === 0 ? "dispatch" : i % 4 === 1 ? "runtime" : i % 4 === 2 ? "execution" : "side_effect",
            eventType: i % 4 === 0
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
    const t0 = node_perf_hooks_1.performance.now();
    const result = (0, ledger_integrity_verifier_1.verifyLedgerIntegrity)({
        ledgerEntries: ledger.snapshot(),
        timelineEvents: ledger.timelineSnapshot(),
    });
    const elapsedMs = node_perf_hooks_1.performance.now() - t0;
    assert.equal(result.summary.status, "valid");
    assert.ok(elapsedMs < 900, `integrity verification elapsed ${elapsedMs.toFixed(2)}ms exceeds 900ms`);
});
