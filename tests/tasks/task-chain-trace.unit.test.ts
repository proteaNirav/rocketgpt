import * as assert from "node:assert/strict";
import { test } from "node:test";
import { InMemoryTaskChainTrace } from "../../src/tasks/integrations/task-chain-trace";

test("chain reference can be created and downstream task can be attached", () => {
  const trace = new InMemoryTaskChainTrace();

  const rootReference = trace.createChainReference({
    handoffFlowId: "pm_to_learner_planning",
    downstreamTaskId: "plan-001",
    metadata: { createdBy: "pm" },
    createdAt: "2026-03-11T18:00:00.000Z",
  });

  const downstreamReference = trace.attachDownstreamTask({
    parentTaskId: "plan-001",
    downstreamTaskId: "wu-001",
    handoffFlowId: "learner_to_builder_work_unit",
    edgeLabel: "planning_to_delivery",
    createdAt: "2026-03-11T18:05:00.000Z",
  });

  assert.equal(rootReference.downstreamTaskId, "plan-001");
  assert.equal(downstreamReference.upstreamTaskId, "plan-001");
  assert.deepEqual(trace.listDownstreamTasks("plan-001"), ["wu-001"]);
});

test("upstream task can be resolved and simple task chain is returned in order", () => {
  const trace = new InMemoryTaskChainTrace();

  trace.attachDownstreamTask({
    parentTaskId: "plan-002",
    downstreamTaskId: "wu-002",
    handoffFlowId: "learner_to_builder_work_unit",
    createdAt: "2026-03-11T18:10:00.000Z",
  });
  trace.attachDownstreamTask({
    parentTaskId: "wu-002",
    downstreamTaskId: "cats-exec-002",
    handoffFlowId: "builder_to_cats_execution",
    createdAt: "2026-03-11T18:15:00.000Z",
  });
  trace.attachDownstreamTask({
    parentTaskId: "cats-exec-002",
    downstreamTaskId: "os-runtime-002",
    handoffFlowId: "cats_to_os_runtime",
    createdAt: "2026-03-11T18:20:00.000Z",
  });

  const upstream = trace.getUpstreamTask("os-runtime-002");
  const chain = trace.getTaskChain("cats-exec-002");

  assert.equal(upstream, "cats-exec-002");
  assert.equal(chain.rootTaskId, "plan-002");
  assert.deepEqual(chain.taskIds, ["plan-002", "wu-002", "cats-exec-002", "os-runtime-002"]);
});

test("invalid chain references fail explicitly", () => {
  const trace = new InMemoryTaskChainTrace();

  assert.throws(
    () =>
      trace.createChainReference({
        downstreamTaskId: "task-only",
        handoffFlowId: undefined as never,
      }),
    /requires handoffFlowId/
  );

  assert.throws(
    () =>
      trace.createChainReference({
        handoffFlowId: "consortium_to_brain_oversight",
      }),
    /requires parentTaskId, upstreamTaskId, or downstreamTaskId/
  );
});
