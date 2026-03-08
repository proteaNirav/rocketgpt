import { JOB_TYPES, clearQueueForTests, enqueue } from "../lib/jobs/queue.mjs";
import { clearResearchStoreForTests, getEvidencePackByPlanId } from "../lib/jobs/research-layer.mjs";
import { clearAnalysisStoreForTests, getAnalysisReportByPlanId } from "../lib/jobs/analyst-layer.mjs";
import { runWorkerLoop } from "../lib/jobs/worker.mjs";

async function main() {
  clearQueueForTests();
  clearResearchStoreForTests();
  clearAnalysisStoreForTests();

  const planId = "plan-analyst-smoke";
  const queued = enqueue(JOB_TYPES.RESEARCH_PACK_BUILD, {
    workflowRunId: "wf-analyst-smoke",
    planId,
    query: "supplier due diligence",
    scope: "chat",
    recencyWindow: "30d",
    allowlistVersion: "v1",
    autoAnalyze: true,
    reportMode: "extended",
  });

  const worker = await runWorkerLoop({
    workerId: "analyst-smoke-worker",
    jobTypes: [JOB_TYPES.RESEARCH_PACK_BUILD, JOB_TYPES.ANALYSIS_REPORT_BUILD],
    pollMs: 10,
    idleExitMs: 300,
    maxIterations: 100,
  });

  const evidencePack = getEvidencePackByPlanId(planId);
  const analysisReport = getAnalysisReportByPlanId(planId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: queued.runId,
        worker,
        evidencePack: evidencePack
          ? {
              packId: evidencePack.pack_id,
              planId: evidencePack.plan_id,
              sourceCount: evidencePack.evidence_refs.length,
              partial: evidencePack.partial,
            }
          : null,
        analysisReport: analysisReport
          ? {
              reportId: analysisReport.reportId,
              planId: analysisReport.planId,
              mode: analysisReport.mode,
              executiveSummary: analysisReport.executiveSummary,
              recommendation: analysisReport.recommendation,
              optionCount: analysisReport.options.length,
            }
          : null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
});

