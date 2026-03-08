import {
  JOB_TYPES,
  enqueue,
  claimNext,
  markDone,
  markFailed,
  persistJobResult,
} from "./queue.mjs";
import { executeCatNode, startWorkflowRun } from "./workflow-engine.mjs";
import { buildEvidencePack } from "./research-layer.mjs";
import { buildAnalysisReport } from "./analyst-layer.mjs";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleResearchPackBuild(job) {
  const pack = buildEvidencePack({
    planId: job.payload?.planId,
    query: job.payload?.query || job.payload?.topic || "",
    scope: job.payload?.scope || "general",
    recencyWindow: job.payload?.recencyWindow || "30d",
    allowlistVersion: job.payload?.allowlistVersion || "v1",
    sourceCap: job.payload?.sourceCap,
    timeboxMs: job.payload?.timeboxMs,
    sessionId: job.payload?.sessionId || job.payload?.chatId || "default-session",
    chatId: job.payload?.chatId || "default-chat",
  });
  const artifact = {
    runId: job.runId,
    jobType: job.jobType,
    generatedAt: new Date().toISOString(),
    evidencePackId: pack.pack_id,
    planId: pack.plan_id,
    partial: pack.partial,
    summary: pack.summary,
    cacheHit: pack.cache_hit,
    sourceCount: Array.isArray(pack.evidence_refs) ? pack.evidence_refs.length : 0,
  };
  const artifactPath = persistJobResult(job.runId, artifact);
  let analysisRunId = null;
  if (job.payload?.autoAnalyze !== false && pack.plan_id) {
    const analysis = enqueue(
      JOB_TYPES.ANALYSIS_REPORT_BUILD,
      {
        workflowRunId: job.payload?.workflowRunId || null,
        planId: pack.plan_id,
        reportMode: job.payload?.reportMode || "short",
        timeboxMs: job.payload?.analysisTimeboxMs || undefined,
      },
      { maxRetries: 1 }
    );
    analysisRunId = analysis.runId;
  }
  return {
    artifactPath,
    evidencePackId: pack.pack_id,
    planId: pack.plan_id,
    summary: pack.summary,
    partial: pack.partial,
    cacheHit: pack.cache_hit,
    analysisRunId,
  };
}

async function handleAnalysisReportBuild(job) {
  const report = buildAnalysisReport({
    workflowRunId: job.payload?.workflowRunId || null,
    planId: job.payload?.planId || "",
    reportMode: job.payload?.reportMode || "short",
    timeboxMs: job.payload?.timeboxMs,
  });
  const artifact = {
    runId: job.runId,
    jobType: job.jobType,
    generatedAt: new Date().toISOString(),
    analysisReportId: report.reportId,
    planId: report.planId,
    mode: report.mode,
    partial: report.partial,
    confidence: report.confidence,
  };
  const artifactPath = persistJobResult(job.runId, artifact);
  return {
    artifactPath,
    status: "ready",
    analysisReportId: report.reportId,
    planId: report.planId,
    mode: report.mode,
  };
}

async function handleWorkflowRun(job) {
  const started = await startWorkflowRun(job);
  const artifact = {
    runId: job.runId,
    jobType: job.jobType,
    generatedAt: new Date().toISOString(),
    workflowId: String(job.payload?.workflowId || "workflow.engine"),
    status: "scheduled",
    scheduledNodes: started.queuedNodes,
    fallbackApplied: started.fallbackApplied,
  };
  const artifactPath = persistJobResult(job.runId, artifact);
  return { artifactPath, status: "scheduled", workflowRunId: started.workflowRunId };
}

async function handleCatRun(job) {
  const result = await executeCatNode(job);
  return {
    status: "completed",
    ...result,
  };
}

async function handleDriftCheck(job) {
  const artifact = {
    runId: job.runId,
    jobType: job.jobType,
    generatedAt: new Date().toISOString(),
    driftDetected: false,
    note: "Async drift check completed.",
  };
  const artifactPath = persistJobResult(job.runId, artifact);
  return { artifactPath, driftDetected: false };
}

function defaultHandlers() {
  return {
    [JOB_TYPES.RESEARCH_PACK_BUILD]: handleResearchPackBuild,
    [JOB_TYPES.ANALYSIS_REPORT_BUILD]: handleAnalysisReportBuild,
    [JOB_TYPES.WORKFLOW_RUN]: handleWorkflowRun,
    [JOB_TYPES.CAT_RUN]: handleCatRun,
    [JOB_TYPES.DRIFT_CHECK]: handleDriftCheck,
  };
}

export async function processOneJob(jobType, options = {}) {
  const handlers = options.handlers || defaultHandlers();
  const workerId = String(options.workerId || "worker-local");
  const retryDelayMs = Number.isInteger(options.retryDelayMs) ? Number(options.retryDelayMs) : 1000;
  const claimed = claimNext(jobType, { workerId });
  if (!claimed) return null;
  const handler = handlers[jobType];
  if (typeof handler !== "function") {
    return markFailed(claimed.runId, `No handler for ${jobType}`, { retryDelayMs });
  }
  try {
    const result = await handler(claimed);
    return markDone(claimed.runId, result ?? {});
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unhandled worker error";
    return markFailed(claimed.runId, reason, { retryDelayMs });
  }
}

export async function runWorkerLoop(options = {}) {
  const workerId = String(options.workerId || "worker-local");
  const pollMs = Number.isInteger(options.pollMs) ? Math.max(50, Number(options.pollMs)) : 300;
  const idleExitMs = Number.isInteger(options.idleExitMs) ? Math.max(500, Number(options.idleExitMs)) : 10_000;
  const maxIterations = Number.isInteger(options.maxIterations) ? Math.max(1, Number(options.maxIterations)) : 10_000;
  const jobTypes = Array.isArray(options.jobTypes) && options.jobTypes.length > 0 ? options.jobTypes : Object.values(JOB_TYPES);
  const start = Date.now();
  let processed = 0;
  let iterations = 0;
  let idleSince = Date.now();

  while (iterations < maxIterations) {
    iterations += 1;
    let didWork = false;
    for (const jobType of jobTypes) {
      const result = await processOneJob(jobType, { workerId, retryDelayMs: options.retryDelayMs });
      if (result) {
        processed += 1;
        didWork = true;
      }
    }
    if (didWork) {
      idleSince = Date.now();
      continue;
    }
    if (Date.now() - idleSince >= idleExitMs) break;
    await sleep(pollMs);
  }

  return {
    workerId,
    processed,
    iterations,
    elapsedMs: Date.now() - start,
  };
}
