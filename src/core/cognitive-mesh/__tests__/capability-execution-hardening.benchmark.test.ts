import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CAPABILITY_IDS } from "../capabilities/constants";
import { LanguageCapability } from "../capabilities/adaptors/language-capability";
import { CapabilityRegistry } from "../capabilities/registry/capability-registry";
import { CapabilityMeshOrchestrator } from "../capabilities/orchestration/capability-mesh-orchestrator";

test("benchmark: capability execution hardening handles 500 invocations under 1200ms", async () => {
  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new LanguageCapability()]);
  const t0 = performance.now();
  for (let i = 0; i < 500; i += 1) {
    const outcome = await orchestrator.invoke({
      requestId: `req-hardening-bench-${i}`,
      sessionId: "session-hardening-bench",
      capabilityId: CAPABILITY_IDS.LANGUAGE,
      purpose: "normalize",
      input: `hello ${i}`,
      trace: {
        requestedOperation: "language.normalize",
        sourceType: "chat.user_text",
      },
      createdAt: new Date().toISOString(),
    });
    assert.equal(outcome.result.status, "success");
  }
  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 1200, `capability execution hardening elapsed ${elapsedMs.toFixed(2)}ms exceeds 1200ms`);
});
