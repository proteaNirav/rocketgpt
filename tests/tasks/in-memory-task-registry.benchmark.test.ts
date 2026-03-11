import * as assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { InMemoryTaskRegistry } from "../../src/tasks/registry/in-memory-task-registry";

test("benchmark: in-memory task registry handles 2000 create/update/report operations under 500ms", () => {
  const registry = new InMemoryTaskRegistry();
  const t0 = performance.now();

  for (let i = 0; i < 2000; i += 1) {
    const taskId = `bench-${i}`;
    registry.createTask({
      taskId,
      title: `Benchmark task ${i}`,
      taskType: "operations",
      sourceLayer: "os",
      ownerRole: "os",
      priority: "normal",
      status: "queued",
      dependencies: [],
    });
    registry.updateTaskStatus(taskId, {
      status: "in_progress",
      updatedAt: `2026-03-11T10:${String(i % 60).padStart(2, "0")}:00.000Z`,
    });
    registry.addReport({
      reportId: `report-${i}`,
      taskId,
      reportingRole: "os",
      statusSummary: "Benchmark status update",
      blockers: [],
      risks: [],
      evidence: [],
      recommendations: [],
      reportedAt: `2026-03-11T10:${String(i % 60).padStart(2, "0")}:30.000Z`,
    });
  }

  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 500, `task registry elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
  assert.equal(registry.listTasks().length, 2000);
  assert.equal(registry.listTasksByStatus("in_progress").length, 2000);
});
