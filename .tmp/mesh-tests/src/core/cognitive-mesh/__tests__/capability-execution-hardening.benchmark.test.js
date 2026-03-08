"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const constants_1 = require("../capabilities/constants");
const language_capability_1 = require("../capabilities/adaptors/language-capability");
const capability_registry_1 = require("../capabilities/registry/capability-registry");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
(0, node_test_1.test)("benchmark: capability execution hardening handles 500 invocations under 1200ms", async () => {
    const orchestrator = new capability_mesh_orchestrator_1.CapabilityMeshOrchestrator(new capability_registry_1.CapabilityRegistry(), [new language_capability_1.LanguageCapability()]);
    const t0 = node_perf_hooks_1.performance.now();
    for (let i = 0; i < 500; i += 1) {
        const outcome = await orchestrator.invoke({
            requestId: `req-hardening-bench-${i}`,
            sessionId: "session-hardening-bench",
            capabilityId: constants_1.CAPABILITY_IDS.LANGUAGE,
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
    const elapsedMs = node_perf_hooks_1.performance.now() - t0;
    assert.ok(elapsedMs < 1200, `capability execution hardening elapsed ${elapsedMs.toFixed(2)}ms exceeds 1200ms`);
});
