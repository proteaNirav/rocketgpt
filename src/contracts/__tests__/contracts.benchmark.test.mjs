import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { validateAnalysisReport } from "../runtime.mjs";

const sampleReport = {
  version: "1.0",
  report_id: "report-bench",
  session_id: "sess-bench",
  status: "needs_review",
  generated_at: "2026-03-05T12:00:00Z",
  workflow_plan_ref: { id: "plan-bench", uri: "rgpt://plans/plan-bench" },
  scorecard_ref: { id: "score-bench", uri: "rgpt://scorecards/score-bench" },
  evidence_pack_ref: { id: "pack-bench", uri: "rgpt://evidence/pack-bench" },
  findings: [
    { code: "F-001", severity: "low", message: "baseline check" },
    { code: "F-002", severity: "medium", message: "latency near threshold" },
  ],
};

test("benchmark: analysis report validation remains lightweight", () => {
  const iterations = 5000;
  const started = performance.now();
  let okCount = 0;

  for (let i = 0; i < iterations; i += 1) {
    if (validateAnalysisReport(sampleReport).ok) {
      okCount += 1;
    }
  }

  const elapsedMs = performance.now() - started;
  const avgMs = elapsedMs / iterations;

  assert.equal(okCount, iterations);
  assert.ok(avgMs < 2.5, `Expected avg validation < 2.5ms, got ${avgMs.toFixed(4)}ms`);
});
