import { JOB_TYPES, clearQueueForTests, enqueue } from "../lib/jobs/queue.mjs";
import { readTimelineEvents } from "../lib/jobs/timeline.mjs";
import { clearWorkflowLedgerForTests, listWorkflowLedgerEvents } from "../lib/jobs/workflow-ledger.mjs";
import { getWorkflowRunWithNodes } from "../lib/jobs/workflow-engine.mjs";
import { clearWorkflowStoreForTests } from "../lib/jobs/workflow-store.mjs";
import { runWorkerLoop } from "../lib/jobs/worker.mjs";

async function main() {
  clearQueueForTests();
  clearWorkflowStoreForTests();
  clearWorkflowLedgerForTests();

  const queued = enqueue(JOB_TYPES.WORKFLOW_RUN, {
    workflowId: "workflow.smoke.v1",
    planId: "plan-smoke-3-node",
    nodes: [
      { nodeId: "node-1", catId: "RGPT-CAT-01", timeoutMs: 500, simulateMs: 5 },
      { nodeId: "node-2", catId: "RGPT-CAT-02", timeoutMs: 500, simulateMs: 5 },
      { nodeId: "node-3", catId: "RGPT-CAT-03", timeoutMs: 500, simulateMs: 5 },
    ],
    edges: [
      { fromNodeId: "node-1", toNodeId: "node-2" },
      { fromNodeId: "node-2", toNodeId: "node-3" },
    ],
  });

  const worker = await runWorkerLoop({
    workerId: "workflow-smoke-worker",
    jobTypes: [JOB_TYPES.WORKFLOW_RUN, JOB_TYPES.CAT_RUN],
    pollMs: 10,
    idleExitMs: 400,
    maxIterations: 200,
  });

  const snapshot = getWorkflowRunWithNodes(queued.runId);
  const timeline = readTimelineEvents(queued.runId, { afterSeq: 0, limit: 300 });
  const ledger = listWorkflowLedgerEvents().filter((row) => {
    const payload = row?.payload || {};
    return String(payload.runId || payload.workflowRunId || "") === queued.runId;
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId: queued.runId,
        worker,
        workflowStatus: snapshot?.workflow?.status ?? null,
        nodeRuns: snapshot?.nodes ?? [],
        timelineEvents: timeline.map((event) => ({ seq: event.seq, type: event.type })),
        ledgerEntries: ledger,
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

