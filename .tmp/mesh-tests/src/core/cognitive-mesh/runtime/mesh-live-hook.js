"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMeshLiveEnabled = isMeshLiveEnabled;
exports.isMeshChatLiveEnabled = isMeshChatLiveEnabled;
exports.runMeshLiveHookIfEnabled = runMeshLiveHookIfEnabled;
exports.runMeshChatHookIfEnabled = runMeshChatHookIfEnabled;
const mesh_live_runtime_1 = require("./mesh-live-runtime");
const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);
function isMeshLiveEnabled(env = process.env) {
    const value = String(env.COGNITIVE_MESH_V1_02_LIVE_ENABLED ?? "").toLowerCase();
    return ENABLED_VALUES.has(value);
}
function isMeshChatLiveEnabled(env = process.env) {
    const value = String(env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED ?? "").toLowerCase();
    return ENABLED_VALUES.has(value);
}
async function runMeshLiveHookIfEnabled(input) {
    if (!isMeshLiveEnabled()) {
        return;
    }
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    await runtime.processWorkflowTrigger({
        sessionId: input.sessionId,
        requestId: input.requestId,
        routeType: input.routeType,
        rawInput: input.rawInput,
        metadata: input.metadata,
    });
}
async function runMeshChatHookIfEnabled(input) {
    if (!isMeshChatLiveEnabled()) {
        return;
    }
    const runtime = (0, mesh_live_runtime_1.getMeshLiveRuntime)();
    runtime.incrementMetric("mesh_chat_hook_invoked");
    await runtime.processChatUserRequest({
        sessionId: input.sessionId,
        requestId: input.requestId,
        routeType: input.routeType,
        rawInput: input.rawInput,
        metadata: input.metadata,
    });
}
