"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = require("node:assert/strict");
const node_perf_hooks_1 = require("node:perf_hooks");
const input_ingestor_1 = require("../sensory/input-ingestor");
const mesh_router_1 = require("../routing/mesh-router");
(0, node_test_1.default)("benchmark: mesh router request path remains lightweight", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const iterations = 200;
    const started = node_perf_hooks_1.performance.now();
    for (let i = 0; i < iterations; i += 1) {
        const event = ingestor.ingest({
            sessionId: "bench-session",
            source: "internal:api",
            rawInput: `sample-input-${i}`,
            processingMode: "sync",
        });
        const result = await router.route(event);
        strict_1.default.equal(result.accepted, true);
    }
    const elapsedMs = node_perf_hooks_1.performance.now() - started;
    const avgMs = elapsedMs / iterations;
    strict_1.default.ok(avgMs < 25, `Expected avg mesh route < 25ms, got ${avgMs.toFixed(3)}ms`);
});
