import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.2,
      firstResponseMs: 8,
      syncPlanId: "plan-feedback-loop",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

test("CAT feedback is synthesized after execution and stored as reusable decision-linked memory", async () => {
  const memory = new CognitiveMemoryService();
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memory,
  });

  await runtime.processWorkflowTrigger({
    sessionId: "cat-feedback-loop-1",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 77, note: "verify memory feedback loop" },
  });

  const memories = memory.listMemoryBySession("cat-feedback-loop-1");
  const synthesized = memories.find((entry) => entry.tags.some((tag) => tag.key === "category" && tag.value === "cat_feedback"));
  assert.ok(synthesized);
  if (!synthesized) {
    throw new Error("missing_synthesized_feedback_memory");
  }
  assert.equal(synthesized.layer, "decision_linked");
  assert.equal(synthesized.metadata?.feedbackId != null, true);

  const experiences = runtime.getRecentExperiences("cat-feedback-loop-1", 10);
  assert.equal(experiences.length >= 1, true);
});
