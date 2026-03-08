import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import { MotivatedRecallEngine } from "../memory/motivated-recall-engine";
import type { MotivatedRecallDecision, MotivatedRecallInput } from "../memory/motivated-recall.types";
import { WORKING_MEMORY_KEYS } from "../brain/constants";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.2,
      firstResponseMs: 9,
      syncPlanId: "plan-motivated-runtime",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

class FixedMotivatedRecallEngine extends MotivatedRecallEngine {
  constructor(private readonly fixed: MotivatedRecallDecision) {
    super();
  }
  override decide(_input: MotivatedRecallInput): MotivatedRecallDecision {
    return { ...this.fixed, reasons: [...this.fixed.reasons], signalsTriggered: [...this.fixed.signalsTriggered] };
  }
}

test("runtime skips memory services when motivated recall is disabled", async () => {
  const memoryService = new CognitiveMemoryService();
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memoryService,
    motivatedRecallEngine: new FixedMotivatedRecallEngine({
      enableRecall: false,
      recallMode: "none",
      score: 0.1,
      confidence: 0.7,
      reasons: ["forced_none"],
      signalsTriggered: [],
    }),
  });
  const sessionId = "mr-runtime-none";

  await runtime.processChatUserRequest({
    sessionId,
    routeType: "/api/demo/chat",
    rawInput: { prompt: "hello" },
  });

  const snapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_MODE]?.value, "none");
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "disabled");
});

test("runtime invokes memory services when motivated recall is enabled", async () => {
  const memoryService = new CognitiveMemoryService();
  memoryService.startSession({
    sessionId: "mr-runtime-hybrid",
    sourceType: "chat",
    startedAt: new Date().toISOString(),
  });
  memoryService.captureConversationMessage({
    sessionId: "mr-runtime-hybrid",
    role: "user",
    source: "chat.user_text",
    content: "Need retrieval verification fallback summary",
    metadata: { routeType: "/api/orchestrator/run/status" },
  });
  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memoryService,
    motivatedRecallEngine: new FixedMotivatedRecallEngine({
      enableRecall: true,
      recallMode: "hybrid",
      score: 0.9,
      confidence: 0.88,
      reasons: ["forced_hybrid"],
      signalsTriggered: ["priorExperienceUsefulness"],
    }),
  });

  await runtime.processWorkflowTrigger({
    sessionId: "mr-runtime-hybrid",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 451, prompt: "verification context" },
  });

  const snapshot = runtime.getSessionBrainSnapshot("mr-runtime-hybrid");
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_MODE]?.value, "hybrid");
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "injected");
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value != null, true);
});
