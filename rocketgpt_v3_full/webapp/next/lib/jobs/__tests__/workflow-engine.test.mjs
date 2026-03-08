import test from "node:test";
import assert from "node:assert/strict";

import { JOB_TYPES, clearQueueForTests, enqueue } from "../queue.mjs";
import { readTimelineEvents } from "../timeline.mjs";
import { clearWorkflowLedgerForTests, listWorkflowLedgerEvents } from "../workflow-ledger.mjs";
import { getWorkflowRunWithNodes } from "../workflow-engine.mjs";
import { clearWorkflowStoreForTests } from "../workflow-store.mjs";
import { runWorkerLoop } from "../worker.mjs";

test("workflow engine runs 3-node chain with timeline and ledger", async () => {
  clearQueueForTests();
  clearWorkflowStoreForTests();
  clearWorkflowLedgerForTests();

  const nodes = [
    { nodeId: "n1", catId: "RGPT-CAT-01", timeoutMs: 500, simulateMs: 5 },
    { nodeId: "n2", catId: "RGPT-CAT-02", timeoutMs: 500, simulateMs: 5 },
    { nodeId: "n3", catId: "RGPT-CAT-03", timeoutMs: 500, simulateMs: 5 },
  ];
  const edges = [
    { fromNodeId: "n1", toNodeId: "n2" },
    { fromNodeId: "n2", toNodeId: "n3" },
  ];
  const queued = enqueue(JOB_TYPES.WORKFLOW_RUN, {
    workflowId: "workflow.test.v1",
    planId: "plan-test-3-node",
    nodes,
    edges,
    requiresResearch: false,
  });

  const result = await runWorkerLoop({
    workerId: "wf-test-worker",
    jobTypes: [JOB_TYPES.WORKFLOW_RUN, JOB_TYPES.CAT_RUN],
    pollMs: 10,
    idleExitMs: 400,
    maxIterations: 200,
  });
  assert.ok(result.processed >= 4);

  const snapshot = getWorkflowRunWithNodes(queued.runId);
  assert.ok(snapshot);
  assert.equal(snapshot.workflow.status, "done");
  assert.equal(snapshot.nodes.length, 3);
  assert.equal(snapshot.nodes.filter((n) => n.status === "done").length, 3);
  assert.ok(snapshot.nodes.every((n) => typeof n.outputRef === "string" && n.outputRef.length > 0));

  const events = readTimelineEvents(queued.runId, { afterSeq: 0, limit: 200 });
  const types = events.map((e) => e.type);
  assert.ok(types.includes("PLAN_CREATED"));
  assert.ok(types.includes("NODE_STARTED"));
  assert.ok(types.includes("NODE_DONE"));

  const ledger = listWorkflowLedgerEvents().filter((row) => {
    const p = row?.payload || {};
    return String(p.runId || p.workflowRunId || "") === queued.runId;
  });
  assert.ok(ledger.length >= 2);
});

