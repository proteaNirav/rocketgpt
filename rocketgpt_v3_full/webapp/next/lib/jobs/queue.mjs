import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { appendTimelineEvent } from "./timeline.mjs";

export const JOB_TYPES = {
  CAT_RUN: "CAT_RUN",
  WORKFLOW_RUN: "WORKFLOW_RUN",
  RESEARCH_PACK_BUILD: "RESEARCH_PACK_BUILD",
  ANALYSIS_REPORT_BUILD: "ANALYSIS_REPORT_BUILD",
  DRIFT_CHECK: "DRIFT_CHECK",
};

const JOB_STATUSES = {
  QUEUED: "queued",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
};

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function repoRootFromCwd() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cursor, "rocketgpt_v3_full")) || fs.existsSync(path.join(cursor, "cats"))) {
      return cursor;
    }
    const next = path.resolve(cursor, "..");
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function queueFilePath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "jobs-queue.json");
}

function resultDirPath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "job-results");
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(queueFilePath(), "utf8"));
    return {
      jobs: Array.isArray(parsed?.jobs) ? parsed.jobs : [],
      telemetry: {
        completed: Number(parsed?.telemetry?.completed || 0),
        failed: Number(parsed?.telemetry?.failed || 0),
        retriesUsed: Number(parsed?.telemetry?.retriesUsed || 0),
      },
    };
  } catch {
    return {
      jobs: [],
      telemetry: { completed: 0, failed: 0, retriesUsed: 0 },
    };
  }
}

function writeStore(store) {
  const fp = queueFilePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(store, null, 2), "utf8");
}

function isValidJobType(jobType) {
  return Object.values(JOB_TYPES).includes(jobType);
}

function toQueueDepth(jobs) {
  return jobs.filter((job) => job.status === JOB_STATUSES.QUEUED).length;
}

function computeFailRate(telemetry) {
  const total = Number(telemetry.completed || 0) + Number(telemetry.failed || 0);
  if (total <= 0) return 0;
  return Number((Number(telemetry.failed || 0) / total).toFixed(4));
}

function telemetrySnapshot(store, jobLatencyMs = null) {
  return {
    queue_depth: toQueueDepth(store.jobs),
    job_latency_ms: typeof jobLatencyMs === "number" ? Number(jobLatencyMs.toFixed(3)) : null,
    job_fail_rate: computeFailRate(store.telemetry),
    retries_used: Number(store.telemetry.retriesUsed || 0),
  };
}

function emitTimeline(event) {
  try {
    appendTimelineEvent(event);
  } catch {
    // timeline is best-effort
  }
}

function timelineRunId(job) {
  const fromWorkflow = job?.payload?.workflowRunId;
  return fromWorkflow ? String(fromWorkflow) : String(job?.runId || "");
}

function startEventType(jobType) {
  if (jobType === JOB_TYPES.WORKFLOW_RUN) return null;
  if (jobType === JOB_TYPES.RESEARCH_PACK_BUILD) return "RESEARCH_STARTED";
  if (jobType === JOB_TYPES.ANALYSIS_REPORT_BUILD) return "ANALYSIS_STARTED";
  return "NODE_STARTED";
}

function doneEventType(jobType) {
  if (jobType === JOB_TYPES.WORKFLOW_RUN) return null;
  if (jobType === JOB_TYPES.RESEARCH_PACK_BUILD) return "RESEARCH_DONE";
  if (jobType === JOB_TYPES.ANALYSIS_REPORT_BUILD) return "ANALYSIS_DONE";
  return "NODE_DONE";
}

export function enqueue(jobType, payload, options = {}) {
  if (!isValidJobType(jobType)) {
    throw new Error(`Unsupported job type: ${jobType}`);
  }
  const started = nowMs();
  const store = readStore();
  const runId = `run_${crypto.randomUUID().replace(/-/g, "")}`;
  const createdAt = nowIso();
  const maxRetries = Number.isInteger(options.maxRetries) ? Math.max(0, Number(options.maxRetries)) : 1;

  store.jobs.push({
    runId,
    jobType,
    payload: payload ?? {},
    status: JOB_STATUSES.QUEUED,
    attempts: 0,
    maxRetries,
    availableAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    claimedAt: null,
    doneAt: null,
    error: null,
    result: null,
    workerId: null,
  });
  writeStore(store);
  if (jobType === JOB_TYPES.WORKFLOW_RUN || jobType === JOB_TYPES.RESEARCH_PACK_BUILD || jobType === JOB_TYPES.ANALYSIS_REPORT_BUILD) {
    emitTimeline({
      runId,
      planId: payload?.planId ? String(payload.planId) : null,
      type: "PLAN_CREATED",
      payload: {
        jobType,
      },
    });
  }
  const enqueueLatencyMs = nowMs() - started;
  return {
    runId,
    status: JOB_STATUSES.QUEUED,
    enqueue_latency_ms: enqueueLatencyMs,
    telemetry: telemetrySnapshot(store),
  };
}

export function claimNext(jobType, options = {}) {
  if (!isValidJobType(jobType)) {
    throw new Error(`Unsupported job type: ${jobType}`);
  }
  const workerId = String(options.workerId || "worker-local");
  const store = readStore();
  const now = nowMs();
  let claimed = null;

  for (const job of store.jobs) {
    if (job.jobType !== jobType) continue;
    if (job.status !== JOB_STATUSES.QUEUED) continue;
    if (Date.parse(String(job.availableAt || "")) > now) continue;
    job.status = JOB_STATUSES.PROCESSING;
    job.claimedAt = nowIso();
    job.updatedAt = job.claimedAt;
    job.workerId = workerId;
    job.attempts = Number(job.attempts || 0) + 1;
    claimed = { ...job };
    const eventType = startEventType(job.jobType);
    if (eventType) {
      emitTimeline({
        runId: timelineRunId(job),
        planId: job.payload?.planId ? String(job.payload.planId) : null,
        type: eventType,
        payload: {
          jobType: job.jobType,
          attempt: job.attempts,
          nodeId: job.payload?.node?.nodeId ?? null,
          catId: job.payload?.node?.catId ?? job.payload?.catId ?? null,
        },
      });
    }
    break;
  }

  if (!claimed) return null;
  writeStore(store);
  return claimed;
}

export function markDone(runId, result = {}) {
  const store = readStore();
  const job = store.jobs.find((item) => item.runId === runId);
  if (!job) throw new Error(`runId not found: ${runId}`);
  if (job.status !== JOB_STATUSES.PROCESSING) throw new Error(`runId not in processing status: ${runId}`);

  const doneAt = nowIso();
  job.status = JOB_STATUSES.DONE;
  job.doneAt = doneAt;
  job.updatedAt = doneAt;
  job.result = result;
  job.error = null;
  store.telemetry.completed = Number(store.telemetry.completed || 0) + 1;
  writeStore(store);
  const eventType = doneEventType(job.jobType);
  if (eventType) {
    emitTimeline({
      runId: timelineRunId(job),
      planId: job.payload?.planId ? String(job.payload.planId) : null,
      type: eventType,
      payload: {
        jobType: job.jobType,
        result,
        nodeId: job.payload?.node?.nodeId ?? null,
        catId: job.payload?.node?.catId ?? job.payload?.catId ?? null,
      },
    });
  }

  const latency = Math.max(0, Date.parse(doneAt) - Date.parse(String(job.createdAt)));
  return {
    runId,
    status: JOB_STATUSES.DONE,
    result,
    telemetry: telemetrySnapshot(store, latency),
  };
}

export function markFailed(runId, errorText, options = {}) {
  const store = readStore();
  const job = store.jobs.find((item) => item.runId === runId);
  if (!job) throw new Error(`runId not found: ${runId}`);
  if (job.status !== JOB_STATUSES.PROCESSING) throw new Error(`runId not in processing status: ${runId}`);

  const retryDelayMs = Number.isInteger(options.retryDelayMs) ? Math.max(0, Number(options.retryDelayMs)) : 1000;
  const now = nowMs();
  const usedAttempts = Number(job.attempts || 0);
  const maxRetries = Number(job.maxRetries || 0);
  const canRetry = usedAttempts <= maxRetries;

  if (canRetry) {
    const availableAt = new Date(now + retryDelayMs).toISOString();
    job.status = JOB_STATUSES.QUEUED;
    job.availableAt = availableAt;
    job.updatedAt = nowIso();
    job.error = String(errorText || "job failed");
    job.result = null;
    store.telemetry.retriesUsed = Number(store.telemetry.retriesUsed || 0) + 1;
    writeStore(store);
    emitTimeline({
      runId: timelineRunId(job),
      planId: job.payload?.planId ? String(job.payload.planId) : null,
      type: "NODE_FAILED",
      payload: {
        jobType: job.jobType,
        retryScheduled: true,
        error: job.error,
        nodeId: job.payload?.node?.nodeId ?? null,
        catId: job.payload?.node?.catId ?? job.payload?.catId ?? null,
      },
    });
    return {
      runId,
      status: JOB_STATUSES.QUEUED,
      retryScheduled: true,
      telemetry: telemetrySnapshot(store),
    };
  }

  const failedAt = nowIso();
  job.status = JOB_STATUSES.FAILED;
  job.updatedAt = failedAt;
  job.doneAt = failedAt;
  job.error = String(errorText || "job failed");
  store.telemetry.failed = Number(store.telemetry.failed || 0) + 1;
  writeStore(store);
  emitTimeline({
    runId: timelineRunId(job),
    planId: job.payload?.planId ? String(job.payload.planId) : null,
    type: "NODE_FAILED",
    payload: {
      jobType: job.jobType,
      retryScheduled: false,
      error: job.error,
      nodeId: job.payload?.node?.nodeId ?? null,
      catId: job.payload?.node?.catId ?? job.payload?.catId ?? null,
    },
  });
  const latency = Math.max(0, Date.parse(failedAt) - Date.parse(String(job.createdAt)));
  return {
    runId,
    status: JOB_STATUSES.FAILED,
    retryScheduled: false,
    telemetry: telemetrySnapshot(store, latency),
  };
}

export function getJob(runId) {
  const store = readStore();
  const job = store.jobs.find((item) => item.runId === runId);
  if (!job) return null;
  return {
    ...job,
    telemetry: telemetrySnapshot(store),
  };
}

export function persistJobResult(runId, payload) {
  fs.mkdirSync(resultDirPath(), { recursive: true });
  const fp = path.join(resultDirPath(), `${runId}.json`);
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), "utf8");
  return fp;
}

export function clearQueueForTests() {
  const fp = queueFilePath();
  try {
    fs.unlinkSync(fp);
  } catch {
    // ignore
  }
}
