import test from "node:test";
import assert from "node:assert/strict";

import { JOB_TYPES, clearQueueForTests, enqueue } from "../queue.mjs";
import { clearResearchStoreForTests, buildEvidencePack } from "../research-layer.mjs";
import { buildAnalysisReport, clearAnalysisStoreForTests, getAnalysisReportByPlanId } from "../analyst-layer.mjs";
import { clearWorkflowStoreForTests } from "../workflow-store.mjs";
import { runWorkerLoop } from "../worker.mjs";

test("analyst layer builds structured short/extended reports", () => {
  clearResearchStoreForTests();
  clearAnalysisStoreForTests();
  clearWorkflowStoreForTests();

  buildEvidencePack({
    planId: "plan-analyst-1",
    query: "procurement controls",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
  });
  const shortReport = buildAnalysisReport({
    planId: "plan-analyst-1",
    reportMode: "short",
  });
  const extendedReport = buildAnalysisReport({
    planId: "plan-analyst-1",
    reportMode: "extended",
  });

  assert.equal(typeof shortReport.executiveSummary, "string");
  assert.ok(Array.isArray(shortReport.options));
  assert.equal(typeof shortReport.recommendation, "string");
  assert.ok(Array.isArray(shortReport.assumptions));
  assert.equal(typeof shortReport.confidence?.score, "number");
  assert.ok(Array.isArray(shortReport.confidence?.sensitivities));
  assert.ok(extendedReport.options.length >= shortReport.options.length);
});

test("analysis job runs after evidence pack and is retrievable by plan", async () => {
  clearQueueForTests();
  clearResearchStoreForTests();
  clearAnalysisStoreForTests();
  clearWorkflowStoreForTests();

  enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
    workflowRunId: "wf-analyst-1",
    planId: "plan-analyst-async",
    query: "contract risk posture",
    scope: "chat",
    recencyWindow: "14d",
    allowlistVersion: "v1",
    reportMode: "extended",
    autoAnalyze: true,
  });

  const worker = await runWorkerLoop({
    workerId: "analyst-test-worker",
    jobTypes: [JOB_TYPES.RESEARCH_PACK_BUILD, JOB_TYPES.ANALYSIS_REPORT_BUILD],
    pollMs: 10,
    idleExitMs: 250,
    maxIterations: 80,
  });
  assert.ok(worker.processed >= 2);

  const report = getAnalysisReportByPlanId("plan-analyst-async");
  assert.ok(report);
  assert.equal(report.planId, "plan-analyst-async");
  assert.equal(typeof report.executiveSummary, "string");
  assert.equal(typeof report.recommendation, "string");
});

