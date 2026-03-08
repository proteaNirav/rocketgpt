import { getMeshLiveRuntime } from "./mesh-live-runtime";

const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

export interface MeshLiveHookInput {
  sessionId: string;
  requestId?: string;
  routeType: string;
  rawInput: unknown;
  metadata?: Record<string, unknown>;
}

export interface MeshChatHookInput extends MeshLiveHookInput {}

export function isMeshLiveEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  const value = String(env.COGNITIVE_MESH_V1_02_LIVE_ENABLED ?? "").toLowerCase();
  return ENABLED_VALUES.has(value);
}

export function isMeshChatLiveEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  const value = String(env.COGNITIVE_MESH_V1_03_CHAT_LIVE_ENABLED ?? "").toLowerCase();
  return ENABLED_VALUES.has(value);
}

export async function runMeshLiveHookIfEnabled(input: MeshLiveHookInput): Promise<void> {
  if (!isMeshLiveEnabled()) {
    return;
  }
  const runtime = getMeshLiveRuntime();
  await runtime.processWorkflowTrigger({
    sessionId: input.sessionId,
    requestId: input.requestId,
    routeType: input.routeType,
    rawInput: input.rawInput,
    metadata: input.metadata,
  });
}

export async function runMeshChatHookIfEnabled(input: MeshChatHookInput): Promise<void> {
  if (!isMeshChatLiveEnabled()) {
    return;
  }
  const runtime = getMeshLiveRuntime();
  runtime.incrementMetric("mesh_chat_hook_invoked");
  await runtime.processChatUserRequest({
    sessionId: input.sessionId,
    requestId: input.requestId,
    routeType: input.routeType,
    rawInput: input.rawInput,
    metadata: input.metadata,
  });
}
