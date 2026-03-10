import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { detectSideEffectDrift } from "../runtime/side-effect-drift-detector";

test("benchmark: side-effect drift detection for 2000 events stays under 900ms", () => {
  const ledger = new ExecutionLedger("", "");
  const ids = {
    executionId: "exec-bench-drift",
    requestId: "req-bench-drift",
    correlationId: "req-bench-drift",
  };
  for (let i = 0; i < 500; i += 1) {
    ledger.append({
      category: "dispatch",
      eventType: "dispatch.guard.evaluated",
      action: `dispatch_${i}`,
      source: "mesh_live_runtime",
      target: "/api/demo/chat",
      ids,
      mode: "normal",
      status: "evaluated",
      metadata: { i },
    });
    ledger.append({
      category: "runtime",
      eventType: "runtime.guard.evaluated",
      action: `runtime_${i}`,
      source: "mesh_live_runtime",
      target: "/api/demo/chat",
      ids,
      mode: "normal",
      status: "evaluated",
      metadata: { i },
    });
    ledger.append({
      category: "side_effect",
      eventType: "side_effect.intent",
      action: `write_audit_${i}`,
      source: "capability_mesh_orchestrator",
      target: `audit_${i}`,
      ids,
      mode: "normal",
      status: "intent",
      sideEffect: { intent: true, completed: false },
      metadata: { i },
    });
    ledger.append({
      category: "side_effect",
      eventType: "side_effect.completed",
      action: `write_audit_${i}`,
      source: "capability_mesh_orchestrator",
      target: `audit_${i}`,
      ids,
      mode: "normal",
      status: "completed",
      sideEffect: { intent: false, completed: true },
      metadata: { i },
    });
  }

  const t0 = performance.now();
  const result = detectSideEffectDrift({
    timelineEvents: ledger.timelineSnapshot(),
    verifyIntegrityIfMissing: true,
  });
  const elapsedMs = performance.now() - t0;
  assert.equal(result.summary.status, "no_drift");
  assert.ok(elapsedMs < 900, `side-effect drift detection elapsed ${elapsedMs.toFixed(2)}ms exceeds 900ms`);
});
