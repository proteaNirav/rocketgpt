import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import {
  CatMemoryAdoptionService,
  type CatMemoryExecutionContext,
  type CompleteCatMemoryInput,
} from "../memory/cat-memory-adoption-service";
import { WORKING_MEMORY_KEYS } from "../brain/constants";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.2,
      firstResponseMs: 10,
      syncPlanId: "plan-threshold",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

class ForcedThresholdSkipAdoptionService extends CatMemoryAdoptionService {
  override prepare(): CatMemoryExecutionContext {
    return {
      decision: {
        injected: false,
        status: "skipped_threshold",
        reason: "forced_test_threshold_skip",
        relevanceFloor: 0.95,
        packetItemCount: 0,
      },
      trace: {
        explicitRecallCount: 0,
        implicitRecallCount: 0,
        selectedMemoryIds: [],
        selectionReason: "forced_test_threshold_skip",
        experienceReuseDecision: {
          influenced: true,
          signalScore: 0.1,
          hint: "do_not_prioritize",
          basis: "forced_test",
        },
      },
    };
  }

  override summarizeOutcome(_input: CompleteCatMemoryInput) {
    return {
      usefulness: "uncertain" as const,
      recommendation: "insufficient_evidence" as const,
      note: "forced_test_threshold_skip",
    };
  }
}

test("CAT runtime path does not inject memory when threshold is not met", async () => {
  const memory = new CognitiveMemoryService();
  const forced = new ForcedThresholdSkipAdoptionService(memory, {
    experienceProvider: () => [],
  });
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memory,
    catMemoryAdoptionService: forced,
  });

  await runtime.processChatUserRequest({
    sessionId: "cat-memory-threshold-skip-1",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "basic hello" },
  });
  const snapshot = runtime.getSessionBrainSnapshot("cat-memory-threshold-skip-1");
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "skipped_threshold");
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value, null);
});

test("optional memory hook path works when memory service is absent", async () => {
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter());
  await runtime.processChatUserRequest({
    sessionId: "cat-memory-disabled-1",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "no memory service configured" },
  });
  const snapshot = runtime.getSessionBrainSnapshot("cat-memory-disabled-1");
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "disabled");
});
