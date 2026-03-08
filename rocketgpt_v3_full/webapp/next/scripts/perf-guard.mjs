import { performance } from "node:perf_hooks";

import { buildFastWorkflowPlan, clearIntelligenceCache } from "../lib/intelligence/fast-intelligence.mjs";
import { JOB_TYPES, clearQueueForTests, enqueue } from "../lib/jobs/queue.mjs";

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function p95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

function parseArgs(argv) {
  return {
    ci: argv.includes("--ci"),
  };
}

function assertThreshold(name, value, thresholdMs) {
  if (value > thresholdMs) {
    throw new Error(`${name} median ${value.toFixed(3)}ms exceeded threshold ${thresholdMs}ms`);
  }
}

function benchmarkPlanLatency(iterations) {
  clearIntelligenceCache();
  const samples = [];
  const basePrompt = "Validate policy approvals and prepare governed workflow execution plan.";

  for (let i = 0; i < iterations; i += 1) {
    const prompt = `${basePrompt} Scenario-${i % 24}`;
    const messages = [{ role: "user", content: prompt }];
    const started = performance.now();
    buildFastWorkflowPlan({
      prompt,
      tenantId: "perf-tenant-plan",
      chatId: "perf-chat-plan",
      messages,
    });
    samples.push(performance.now() - started);
  }
  return {
    medianMs: median(samples),
    p95Ms: p95(samples),
  };
}

function benchmarkHotPathLatency(iterations) {
  clearIntelligenceCache();
  const samples = [];
  const basePrompt = "Need quick policy routing and evidence-backed recommendation.";

  for (let i = 0; i < iterations; i += 1) {
    const prompt = `${basePrompt} Req-${i % 16}`;
    const messages = [{ role: "user", content: prompt }];
    clearQueueForTests();
    const started = performance.now();
    const intelligence = buildFastWorkflowPlan({
      prompt,
      tenantId: "perf-tenant-api",
      chatId: "perf-chat-api",
      messages,
    });
    enqueue(JOB_TYPES.WORKFLOW_RUN, {
      workflowId: "perf.demo.chat.workflow",
      planId: intelligence.workflowPlan.planId,
      nodes: intelligence.workflowPlan.nodes,
      edges: intelligence.workflowPlan.edges,
      requiresResearch: intelligence.requiresResearch,
      fallbackApplied: intelligence.telemetry?.fallback_applied === true,
      nodeTimeoutMs: 800,
    });
    samples.push(performance.now() - started);
  }
  return {
    medianMs: median(samples),
    p95Ms: p95(samples),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const iterations = args.ci ? 80 : 120;
  const thresholds = args.ci
    ? {
        planMedianMs: 140,
        hotPathMedianMs: 220,
      }
    : {
        planMedianMs: 90,
        hotPathMedianMs: 150,
      };

  const plan = benchmarkPlanLatency(iterations);
  const hotPath = benchmarkHotPathLatency(iterations);

  assertThreshold("plan_generation_latency", plan.medianMs, thresholds.planMedianMs);
  assertThreshold("hot_path_api_latency", hotPath.medianMs, thresholds.hotPathMedianMs);

  const report = {
    ok: true,
    mode: args.ci ? "ci" : "local",
    iterations,
    thresholds_ms: thresholds,
    plan_generation: plan,
    hot_path_api: hotPath,
  };
  console.log(JSON.stringify(report, null, 2));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
}
