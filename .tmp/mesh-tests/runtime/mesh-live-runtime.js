"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshLiveRuntime = void 0;
exports.getMeshLiveRuntime = getMeshLiveRuntime;
exports.resetMeshLiveRuntimeForTests = resetMeshLiveRuntimeForTests;
const input_ingestor_1 = require("../sensory/input-ingestor");
const mesh_router_1 = require("../routing/mesh-router");
class MeshLiveRuntime {
    constructor(ingestor = new input_ingestor_1.InputIngestor(), router = new mesh_router_1.MeshRouter()) {
        this.ingestor = ingestor;
        this.router = router;
    }
    async processWorkflowTrigger(input) {
        const event = this.ingestor.ingest({
            sessionId: input.sessionId,
            requestId: input.requestId,
            source: "workflow:trigger",
            routeType: input.routeType,
            rawInput: input.rawInput,
            metadata: {
                ...input.metadata,
                sourceType: "workflow.trigger",
            },
            processingMode: "sync",
        });
        return this.router.route(event);
    }
    async processChatUserRequest(input) {
        const event = this.ingestor.ingest({
            sessionId: input.sessionId,
            requestId: input.requestId,
            source: "chat:user_text",
            routeType: input.routeType,
            rawInput: input.rawInput,
            metadata: {
                ...input.metadata,
                sourceType: "chat.user_text",
            },
            processingMode: "sync",
        });
        return this.router.route(event);
    }
    getMetricsSnapshot() {
        return this.router.getMetricsSnapshot();
    }
    getRepositorySnapshot() {
        return this.router.getRepositorySnapshot();
    }
    incrementMetric(name) {
        this.router.incrementMetric(name);
    }
}
exports.MeshLiveRuntime = MeshLiveRuntime;
let singleton = null;
function getMeshLiveRuntime() {
    singleton ?? (singleton = new MeshLiveRuntime());
    return singleton;
}
function resetMeshLiveRuntimeForTests() {
    singleton = null;
}
