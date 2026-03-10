import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import { WORKING_MEMORY_KEYS } from "../brain/constants";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.18,
      firstResponseMs: 11,
      syncPlanId: "plan-reuse-selection",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

test("prior useful experience influences later memory selection hint", async () => {
  const memory = new CognitiveMemoryService();
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memory,
  });
  const sessionId = "cat-experience-reuse-1";

  await runtime.processWorkflowTrigger({
    sessionId,
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 91, note: "first run" },
  });
  const first = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(first);
  if (!first) {
    throw new Error("missing_first_snapshot");
  }
  const firstHint = first.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_REUSE_HINT]?.value;

  await runtime.processWorkflowTrigger({
    sessionId,
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 92, note: "second run with prior experience" },
  });
  const second = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(second);
  if (!second) {
    throw new Error("missing_second_snapshot");
  }
  const secondHint = second.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_REUSE_HINT]?.value;
  assert.equal(typeof secondHint, "string");
  assert.equal(secondHint === "prefer_next_time" || secondHint === "use_cautiously", true);
  assert.equal(firstHint !== undefined, true);
});
