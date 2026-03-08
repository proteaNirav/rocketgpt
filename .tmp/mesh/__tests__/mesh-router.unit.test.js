"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = require("node:assert/strict");
const input_ingestor_1 = require("../sensory/input-ingestor");
const mesh_router_1 = require("../routing/mesh-router");
(0, node_test_1.default)("mesh router accepts restricted sync event and schedules async jobs", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const event = ingestor.ingest({
        sessionId: "sess-1",
        source: "external:web",
        rawInput: "hello mesh",
        processingMode: "sync",
    });
    const result = await router.route(event);
    strict_1.default.equal(result.accepted, true);
    strict_1.default.ok((result.syncPlanId ?? "").startsWith("plan_"));
    strict_1.default.equal(result.asyncJobIds.length, 2);
});
(0, node_test_1.default)("mesh router rejects blocked input at principal intake", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const event = ingestor.ingest({
        sessionId: "sess-2",
        source: "external:web",
        rawInput: "malicious payload",
        metadata: { trustClass: "blocked" },
    });
    const result = await router.route(event);
    strict_1.default.equal(result.accepted, false);
    strict_1.default.equal(result.asyncJobIds.length, 0);
});
