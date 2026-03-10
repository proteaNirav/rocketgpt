import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { buildFastWorkflowPlan, clearIntelligenceCache } from "../fast-intelligence.mjs";

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

test("benchmark: 200 iterations median <80ms", () => {
  clearIntelligenceCache();
  const samples = [];
  const prompt = "Validate policy and generate governed workflow plan for proposal review.";
  const messages = [{ role: "user", content: prompt }];

  for (let i = 0; i < 200; i += 1) {
    const started = performance.now();
    buildFastWorkflowPlan({
      prompt,
      tenantId: "tenant-bench",
      messages,
    });
    samples.push(performance.now() - started);
  }

  const medianMs = median(samples);
  assert.ok(medianMs < 80, `Expected median <80ms, got ${medianMs.toFixed(3)}ms`);
});
