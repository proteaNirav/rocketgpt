import { JOB_TYPES, enqueue, persistJobResult } from "./queue.mjs";
import { appendTimelineEvent } from "./timeline.mjs";
import {
  WORKFLOW_STATUS,
  createWorkflowRun,
  getNodeRun,
  getWorkflowRun,
  listNodeRuns,
  markWorkflowStatus,
  upsertNodeRun,
} from "./workflow-store.mjs";
import { appendWorkflowLedgerEvent } from "./workflow-ledger.mjs";

const MAX_NODES = 10;
const MAX_RETRIES = 1;
const DEFAULT_NODE_TIMEOUT_MS = 800;
const governanceNodeCache = new Map();
const governanceFinalCache = new Map();

async function callGovernancePreflightBestEffort(input) {
  try {
    const mod = await import("@/lib/governance/governance-service");
    const fn = mod?.governancePreflight ?? mod?.evaluateGovernancePreflight;
    if (typeof fn === "function") {
      return await fn(input);
    }
  } catch {
    // best-effort fallback
  }
  return { decision: "allow", action: "allow", result: "allow" };
}

async function callGovernancePostRunBestEffort(input) {
  try {
    const mod = await import("@/lib/governance/governance-service");
    const fn = mod?.governancePostRun ?? mod?.evaluateGovernancePostRun ?? mod?.postRun;
    if (typeof fn === "function") {
      await fn(input);
      return;
    }
  } catch {
    // best-effort fallback
  }
}

function keyNode(runId, nodeId) {
  return `${String(runId)}::${String(nodeId)}`;
}

function parseNodeTimeoutMs(workflow, node) {
  const fromNode = Number(node?.timeoutMs || 0);
  if (Number.isFinite(fromNode) && fromNode > 0) return fromNode;
  const fromBudget = Number(workflow?.budget?.nodeTimeoutMs || 0);
  if (Number.isFinite(fromBudget) && fromBudget > 0) return fromBudget;
  return DEFAULT_NODE_TIMEOUT_MS;
}

function applyBudget(workflowPayload) {
  const originalNodes = Array.isArray(workflowPayload?.nodes) ? workflowPayload.nodes : [];
  const edges = Array.isArray(workflowPayload?.edges) ? workflowPayload.edges : [];
  if (originalNodes.length <= MAX_NODES) {
    return {
      nodes: originalNodes,
      edges,
      fallbackApplied: !!workflowPayload?.fallbackApplied,
      maxRetries: MAX_RETRIES,
    };
  }
  const allowedIds = new Set(originalNodes.slice(0, MAX_NODES).map((n) => String(n?.nodeId || "")));
  const simplifiedEdges = edges.filter(
    (edge) => allowedIds.has(String(edge?.fromNodeId || "")) && allowedIds.has(String(edge?.toNodeId || ""))
  );
  return {
    nodes: originalNodes.slice(0, MAX_NODES),
    edges: simplifiedEdges,
    fallbackApplied: true,
    maxRetries: MAX_RETRIES,
  };
}

function buildIncoming(workflow) {
  const incoming = new Map();
  for (const node of workflow.nodes || []) {
    incoming.set(String(node?.nodeId || ""), new Set());
  }
  for (const edge of workflow.edges || []) {
    const to = String(edge?.toNodeId || "");
    const from = String(edge?.fromNodeId || "");
    if (!incoming.has(to)) incoming.set(to, new Set());
    incoming.get(to).add(from);
  }
  return incoming;
}

function readyNodes(workflow, nodeRunsById) {
  const incoming = buildIncoming(workflow);
  const out = [];
  for (const node of workflow.nodes || []) {
    const nodeId = String(node?.nodeId || "");
    const state = nodeRunsById[nodeId];
    if (state && ["queued", "running", "done", "failed", "retrying"].includes(String(state.status))) continue;
    const deps = Array.from(incoming.get(nodeId) || []);
    const depsDone = deps.every((depId) => String(nodeRunsById[depId]?.status || "") === "done");
    if (depsDone) out.push(node);
  }
  return out;
}

function mapNodeRunsById(runId) {
  const rows = listNodeRuns(runId);
  const out = {};
  for (const row of rows) {
    out[String(row.nodeId)] = row;
  }
  return out;
}

async function governanceNodeCheckCached(runId, workflowId, node) {
  const nodeId = String(node?.nodeId || "");
  const cacheKey = keyNode(runId, nodeId);
  if (governanceNodeCache.has(cacheKey)) return governanceNodeCache.get(cacheKey);
  const result = await callGovernancePreflightBestEffort({
    runId,
    workflowId,
    nodes: [node],
    params: { scope: "node" },
    actorId: null,
    orgId: null,
  });
  governanceNodeCache.set(cacheKey, result);
  return result;
}

async function governanceFinalCheckCached(runId, workflowId, results) {
  if (governanceFinalCache.has(runId)) return governanceFinalCache.get(runId);
  await callGovernancePostRunBestEffort({
    runId,
    workflowId,
    crpsId: `crps_${String(runId).slice(-8)}`,
    results,
  });
  const result = { ok: true };
  governanceFinalCache.set(runId, result);
  return result;
}

async function emitGovernanceLedgerBestEffort(runId, workflowId, eventType, payload) {
  try {
    const mod = await import("@/lib/db/governanceRepo");
    const append = mod?.appendGovernanceLedgerEvent;
    if (typeof append !== "function") return;
    await append({
      eventType,
      runId,
      workflowId,
      crpsId: null,
      payload,
    });
  } catch {
    // best-effort
  }
}

export async function startWorkflowRun(workflowJob) {
  const runId = String(workflowJob.runId);
  const planId = String(workflowJob.payload?.planId || "");
  const budgeted = applyBudget(workflowJob.payload || {});
  const created = createWorkflowRun({
    runId,
    planId,
    nodes: budgeted.nodes,
    edges: budgeted.edges,
    maxNodes: MAX_NODES,
    nodeTimeoutMs: Number(workflowJob.payload?.nodeTimeoutMs || DEFAULT_NODE_TIMEOUT_MS),
    maxRetries: budgeted.maxRetries,
    fallbackApplied: budgeted.fallbackApplied,
  });
  appendWorkflowLedgerEvent("workflow.run.created", {
    runId,
    planId,
    nodeCount: created.nodes.length,
  });
  await emitGovernanceLedgerBestEffort(runId, "workflow.engine", "risk_eval", {
    phase: "workflow_start",
    planId,
    nodeCount: created.nodes.length,
  });

  if (budgeted.fallbackApplied) {
    appendTimelineEvent({
      runId,
      planId,
      type: "FALLBACK_APPLIED",
      payload: {
        reason: "budget_exceeded",
        maxNodes: MAX_NODES,
      },
    });
  }
  const queued = scheduleReadyNodes(runId);
  return {
    workflowRunId: runId,
    queuedNodes: queued,
    fallbackApplied: budgeted.fallbackApplied,
  };
}

function scheduleReadyNodes(runId) {
  const workflow = getWorkflowRun(runId);
  if (!workflow) return 0;
  const nodeRuns = mapNodeRunsById(runId);
  const ready = readyNodes(workflow, nodeRuns);
  let queued = 0;
  for (const node of ready) {
    const nodeId = String(node?.nodeId || "");
    if (getNodeRun(runId, nodeId)) continue;
    const timeoutMs = parseNodeTimeoutMs(workflow, node);
    upsertNodeRun({
      runId,
      nodeId,
      catId: node?.catId || "",
      status: "queued",
      attempts: 0,
      timeoutMs,
      outputRef: null,
      error: null,
    });
    enqueue(
      JOB_TYPES.CAT_RUN,
      {
        workflowRunId: runId,
        planId: workflow.planId,
        node,
        nodeTimeoutMs: timeoutMs,
      },
      { maxRetries: MAX_RETRIES }
    );
    queued += 1;
  }
  return queued;
}

export async function executeCatNode(catJob) {
  const workflowRunId = String(catJob.payload?.workflowRunId || "");
  const node = catJob.payload?.node || {};
  const nodeId = String(node?.nodeId || "");
  const catId = String(node?.catId || "");
  const workflow = getWorkflowRun(workflowRunId);
  if (!workflow) throw new Error(`workflow run not found: ${workflowRunId}`);

  const existing = getNodeRun(workflowRunId, nodeId);
  const timeoutMs = parseNodeTimeoutMs(workflow, node);
  upsertNodeRun({
    runId: workflowRunId,
    nodeId,
    catId,
    status: "running",
    attempts: Number(catJob.attempts || existing?.attempts || 0),
    timeoutMs,
    jobRunId: catJob.runId,
  });

  const gov = await governanceNodeCheckCached(workflowRunId, "workflow.engine", {
    nodeId,
    catId,
  });
  const decision = String(gov?.decision || gov?.action || gov?.result || "allow").toLowerCase();
  if (decision === "block") {
    if (Number(catJob.attempts || 0) > Number(catJob.maxRetries || 0)) {
      upsertNodeRun({
        runId: workflowRunId,
        nodeId,
        catId,
        status: "failed",
        attempts: Number(catJob.attempts || 0),
        error: "governance_blocked",
      });
      await maybeFinalizeWorkflow(workflowRunId);
    } else {
      upsertNodeRun({
        runId: workflowRunId,
        nodeId,
        catId,
        status: "retrying",
        attempts: Number(catJob.attempts || 0),
        error: "governance_blocked",
      });
    }
    throw new Error("governance_blocked");
  }

  const simulatedMs = Number(node?.simulateMs || 10);
  if (simulatedMs > timeoutMs) {
    if (Number(catJob.attempts || 0) > Number(catJob.maxRetries || 0)) {
      upsertNodeRun({
        runId: workflowRunId,
        nodeId,
        catId,
        status: "failed",
        attempts: Number(catJob.attempts || 0),
        error: "node_timeout",
      });
      await maybeFinalizeWorkflow(workflowRunId);
    } else {
      upsertNodeRun({
        runId: workflowRunId,
        nodeId,
        catId,
        status: "retrying",
        attempts: Number(catJob.attempts || 0),
        error: "node_timeout",
      });
    }
    throw new Error("node_timeout");
  }

  const output = {
    workflowRunId,
    nodeId,
    catId,
    completedAt: new Date().toISOString(),
    status: "success",
  };
  const outputRef = persistJobResult(`node_${catJob.runId}`, output);
  upsertNodeRun({
    runId: workflowRunId,
    nodeId,
    catId,
    status: "done",
    attempts: Number(catJob.attempts || 0),
    outputRef,
    error: null,
  });
  appendWorkflowLedgerEvent("workflow.node.done", {
    workflowRunId,
    nodeId,
    catId,
    outputRef,
  });
  await emitGovernanceLedgerBestEffort(workflowRunId, "workflow.engine", "risk_eval", {
    phase: "node_done",
    nodeId,
    catId,
    outputRef,
  });

  scheduleReadyNodes(workflowRunId);
  await maybeFinalizeWorkflow(workflowRunId);
  return { outputRef, status: "success" };
}

async function maybeFinalizeWorkflow(runId) {
  const workflow = getWorkflowRun(runId);
  if (!workflow || workflow.status === WORKFLOW_STATUS.DONE || workflow.status === WORKFLOW_STATUS.FAILED) {
    return;
  }
  const rows = listNodeRuns(runId);
  const total = Array.isArray(workflow.nodes) ? workflow.nodes.length : 0;
  const doneCount = rows.filter((row) => row.status === "done").length;
  const failedCount = rows.filter((row) => row.status === "failed").length;
  const activeCount = rows.filter((row) => ["queued", "running", "retrying"].includes(String(row.status))).length;
  if (activeCount > 0) return;
  if (doneCount + failedCount < total) return;

  const finalStatus = failedCount > 0 ? WORKFLOW_STATUS.FAILED : WORKFLOW_STATUS.DONE;
  await governanceFinalCheckCached(
    runId,
    "workflow.engine",
    rows.map((row) => ({
      nodeId: row.nodeId,
      status: row.status === "done" ? "success" : "failed",
    }))
  );
  markWorkflowStatus(runId, finalStatus);
  appendWorkflowLedgerEvent("workflow.run.finalized", {
    runId,
    status: finalStatus,
    doneCount,
    failedCount,
  });
  await emitGovernanceLedgerBestEffort(runId, "workflow.engine", "containment_applied", {
    phase: "workflow_finalized",
    status: finalStatus,
    doneCount,
    failedCount,
  });
}

export function getWorkflowRunWithNodes(runId) {
  const workflow = getWorkflowRun(runId);
  if (!workflow) return null;
  return {
    workflow,
    nodes: listNodeRuns(runId),
  };
}
