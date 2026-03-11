import * as assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { TaskGovernanceAdapter } from "../../src/tasks/adapters/task-governance-adapter";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("benchmark: governance adapter processes 1000 create-report-status action sets under 500ms", () => {
  const adapter = new TaskGovernanceAdapter({ registry: new InMemoryTaskRegistry() });
  const t0 = performance.now();

  for (let i = 0; i < 1000; i += 1) {
    const taskId = `gov-task-${i}`;
    adapter.createTaskFromAction({
      actionId: `create-${i}`,
      taskId,
      title: `Governed task ${i}`,
      actionType: "create_task",
      sourceLayer: "learner",
      ownerRole: "learner",
      targetRole: "builder",
      taskType: "implementation",
      taskPriority: "normal",
      occurredAt: "2026-03-11T12:00:00.000Z",
    });
    adapter.reportTaskFromAction({
      actionId: `report-${i}`,
      taskId,
      title: `Report ${i}`,
      actionType: "report_task",
      sourceLayer: "builder",
      ownerRole: "learner",
      actorRole: "builder",
      reportSummary: "Progress update",
      occurredAt: "2026-03-11T12:01:00.000Z",
    });
    adapter.applyLifecycleFromAction({
      actionId: `status-${i}`,
      taskId,
      title: `Status ${i}`,
      actionType: "update_task_status",
      sourceLayer: "builder",
      ownerRole: "learner",
      actorRole: "builder",
      taskStatus: "in_progress",
      occurredAt: "2026-03-11T12:02:00.000Z",
    });
  }

  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 500, `governance adapter elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
  assert.equal(adapter.getRegistry().listTasksByStatus("in_progress").length, 1000);
});
