import { test } from "node:test";
import * as assert from "node:assert/strict";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";
import { WORKING_MEMORY_KEYS } from "../brain/constants";
import { MotivatedRecallEngine } from "../memory/motivated-recall-engine";
import type { MotivatedRecallDecision, MotivatedRecallInput } from "../memory/motivated-recall.types";

class SuccessRouter extends MeshRouter {
  override async route(): Promise<MeshRouteResult> {
    return {
      accepted: true,
      disposition: "allow",
      trustClass: "trusted",
      riskScore: 0.2,
      firstResponseMs: 9,
      syncPlanId: "plan-cat-memory",
      asyncJobIds: [],
      reasons: ["accepted_by_mesh_router"],
    };
  }
}

class FixedEnabledMotivatedRecallEngine extends MotivatedRecallEngine {
  override decide(_input: MotivatedRecallInput): MotivatedRecallDecision {
    return {
      enableRecall: true,
      recallMode: "hybrid",
      score: 0.9,
      confidence: 0.85,
      reasons: ["forced_for_test"],
      signalsTriggered: ["goalRelevance"],
    };
  }
}

test("CAT runtime path injects bounded memory packet when relevant", async () => {
  const memory = new CognitiveMemoryService();
  memory.startSession({
    sessionId: "cat-memory-inject-1",
    sourceType: "chat",
    startedAt: new Date().toISOString(),
  });
  memory.captureConversationMessage({
    sessionId: "cat-memory-inject-1",
    role: "user",
    source: "chat.user_text",
    content: "verification fallback policy for retrieval capability",
    metadata: { routeType: "/api/demo/chat" },
  });

  const runtime = new MeshLiveRuntime(undefined, new SuccessRouter(), {
    cognitiveMemoryService: memory,
    motivatedRecallEngine: new FixedEnabledMotivatedRecallEngine(),
  });
  await runtime.processChatUserRequest({
    sessionId: "cat-memory-inject-1",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "Need verification fallback policy details" },
  });

  const snapshot = runtime.getSessionBrainSnapshot("cat-memory-inject-1");
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_snapshot");
  }
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS]?.value, "injected");
  const packetId = snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID]?.value as string | null;
  assert.equal(typeof packetId === "string" && packetId.length > 0, true);
  const memories = memory.listMemoryBySession("cat-memory-inject-1");
  assert.equal(memories.length > 0, true);
  const selectionReason = snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_SELECTION_REASON]?.value as string | undefined;
  assert.equal(typeof selectionReason === "string" && selectionReason.includes("eligible="), true);
});
