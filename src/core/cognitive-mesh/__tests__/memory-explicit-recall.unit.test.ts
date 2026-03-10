import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveMemoryService } from "../memory/cognitive-memory-service";

test("explicit recall returns ranked memories and records recall event", () => {
  const service = new CognitiveMemoryService();
  service.startSession({
    sessionId: "mem-explicit-1",
    sourceType: "chat",
    startedAt: new Date().toISOString(),
  });
  service.captureConversationMessage({
    sessionId: "mem-explicit-1",
    role: "user",
    content: "Need runtime policy summary for capability fallback handling",
    source: "chat.user_text",
    metadata: { routeType: "/api/demo/chat" },
  });
  service.captureConversationMessage({
    sessionId: "mem-explicit-1",
    role: "assistant",
    content: "Stored decision trail details for verification gating",
    source: "chat.assistant_text",
    metadata: { routeType: "/api/demo/chat" },
  });

  const result = service.explicitRecallSearch({
    sessionId: "mem-explicit-1",
    query: "verification",
    limit: 2,
    minRelevance: 0.2,
  });

  assert.equal(result.items.length >= 1, true);
  assert.equal(result.recallEvent.mode, "explicit");
  assert.equal(result.recallEvent.selectedMemoryIds.length, result.items.length);
});
