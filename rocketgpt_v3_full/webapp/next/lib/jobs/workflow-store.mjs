import fs from "node:fs";
import path from "node:path";

const WORKFLOW_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
};

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

function storePath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "workflow-store.json");
}

function nowIso() {
  return new Date().toISOString();
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return {
      workflow_runs: parsed?.workflow_runs && typeof parsed.workflow_runs === "object" ? parsed.workflow_runs : {},
      node_runs: parsed?.node_runs && typeof parsed.node_runs === "object" ? parsed.node_runs : {},
    };
  } catch {
    return { workflow_runs: {}, node_runs: {} };
  }
}

function writeStore(store) {
  const fp = storePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(store, null, 2), "utf8");
}

export function createWorkflowRun(input) {
  const store = readStore();
  const runId = String(input.runId);
  const now = nowIso();
  store.workflow_runs[runId] = {
    runId,
    planId: String(input.planId || ""),
    status: WORKFLOW_STATUS.RUNNING,
    nodes: Array.isArray(input.nodes) ? input.nodes : [],
    edges: Array.isArray(input.edges) ? input.edges : [],
    budget: {
      maxNodes: Number(input.maxNodes || 10),
      nodeTimeoutMs: Number(input.nodeTimeoutMs || 800),
      maxRetries: Number(input.maxRetries || 1),
      fallbackApplied: !!input.fallbackApplied,
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  if (!store.node_runs[runId]) store.node_runs[runId] = {};
  writeStore(store);
  return store.workflow_runs[runId];
}

export function getWorkflowRun(runId) {
  const store = readStore();
  return store.workflow_runs[String(runId)] || null;
}

export function getNodeRun(runId, nodeId) {
  const store = readStore();
  return store.node_runs[String(runId)]?.[String(nodeId)] || null;
}

export function upsertNodeRun(input) {
  const store = readStore();
  const runId = String(input.runId);
  const nodeId = String(input.nodeId);
  const now = nowIso();
  const current = store.node_runs[runId]?.[nodeId] || null;
  if (!store.node_runs[runId]) store.node_runs[runId] = {};
  const next = {
    runId,
    nodeId,
    catId: String(input.catId || current?.catId || ""),
    status: String(input.status || current?.status || "queued"),
    attempts: Number(input.attempts ?? current?.attempts ?? 0),
    timeoutMs: Number(input.timeoutMs ?? current?.timeoutMs ?? 0),
    jobRunId: input.jobRunId ? String(input.jobRunId) : current?.jobRunId ?? null,
    outputRef: input.outputRef ? String(input.outputRef) : current?.outputRef ?? null,
    error: input.error ? String(input.error) : current?.error ?? null,
    updatedAt: now,
    createdAt: current?.createdAt || now,
  };
  store.node_runs[runId][nodeId] = next;
  if (store.workflow_runs[runId]) store.workflow_runs[runId].updatedAt = now;
  writeStore(store);
  return next;
}

export function listNodeRuns(runId) {
  const store = readStore();
  return Object.values(store.node_runs[String(runId)] || {});
}

export function markWorkflowStatus(runId, status) {
  const store = readStore();
  const id = String(runId);
  if (!store.workflow_runs[id]) return null;
  const now = nowIso();
  store.workflow_runs[id].status = String(status);
  store.workflow_runs[id].updatedAt = now;
  if (status === WORKFLOW_STATUS.DONE || status === WORKFLOW_STATUS.FAILED) {
    store.workflow_runs[id].completedAt = now;
  }
  writeStore(store);
  return store.workflow_runs[id];
}

export function clearWorkflowStoreForTests() {
  try {
    fs.unlinkSync(storePath());
  } catch {
    // ignore
  }
}

export { WORKFLOW_STATUS };

