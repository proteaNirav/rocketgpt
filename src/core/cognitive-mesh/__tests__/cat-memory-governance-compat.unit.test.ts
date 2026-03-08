import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import { CapabilityMeshOrchestrator } from "../capabilities/orchestration/capability-mesh-orchestrator";
import { CapabilityRegistry } from "../capabilities/registry/capability-registry";
import { RetrievalCapability } from "../capabilities/adaptors/retrieval-capability";
import { WORKING_MEMORY_KEYS } from "../brain/constants";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.22,
      firstResponseMs: 10,
      syncPlanId: "plan-governance-compat",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

test("memory-aware CAT flow preserves Batch-9 verification/trust semantics", async () => {
  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new RetrievalCapability([])]);
  const memory = new CognitiveMemoryService();
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memory,
    capabilityOrchestrator: orchestrator,
  });

  await runtime.processWorkflowTrigger({
    sessionId: "cat-memory-governance-compat-1",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 333, note: "verification service intentionally missing" },
  });
  const snapshot = runtime.getSessionBrainSnapshot("cat-memory-governance-compat-1");
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  const committedPayload = snapshot.workingMemory["runtime.capability.retrieval.payload"]?.value;
  assert.equal(committedPayload, undefined);
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value !== undefined, true);
});
