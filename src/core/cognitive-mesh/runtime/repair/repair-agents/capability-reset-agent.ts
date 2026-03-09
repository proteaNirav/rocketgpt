import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeRepairAgentExecutionContext, RuntimeRepairAgentResult } from "../runtime-repair.types";

interface CapabilityStateFile {
  schemaVersion: "rgpt.capability_runtime_state.v1";
  updatedAt: string;
  capabilities: Record<string, { locked: boolean; lockOwner?: string; timeoutCount?: number; lastResetAt?: string }>;
}

function defaultCapabilityState(nowIso: string): CapabilityStateFile {
  return {
    schemaVersion: "rgpt.capability_runtime_state.v1",
    updatedAt: nowIso,
    capabilities: {},
  };
}

async function readCapabilityState(path: string, nowIso: string): Promise<CapabilityStateFile> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return defaultCapabilityState(nowIso);
    }
    const record = parsed as Record<string, unknown>;
    const capabilitiesRaw =
      record.capabilities && typeof record.capabilities === "object" && !Array.isArray(record.capabilities)
        ? (record.capabilities as CapabilityStateFile["capabilities"])
        : {};
    return {
      schemaVersion: "rgpt.capability_runtime_state.v1",
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : nowIso,
      capabilities: { ...capabilitiesRaw },
    };
  } catch {
    return defaultCapabilityState(nowIso);
  }
}

export class CapabilityResetAgent {
  readonly id = "capability_reset_agent";

  async execute(context: RuntimeRepairAgentExecutionContext): Promise<RuntimeRepairAgentResult> {
    const startedAt = context.now.toISOString();
    const targetId = context.diagnosis.likelyTargetId ?? "capability_unknown";
    const state = await readCapabilityState(context.config.capabilityRuntimeStatePath, startedAt);
    const current = state.capabilities[targetId] ?? { locked: false, timeoutCount: 0 };

    state.capabilities[targetId] = {
      locked: false,
      timeoutCount: 0,
      lockOwner: undefined,
      lastResetAt: startedAt,
    };
    state.updatedAt = startedAt;

    await mkdir(dirname(context.config.capabilityRuntimeStatePath), { recursive: true });
    await writeFile(context.config.capabilityRuntimeStatePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

    return {
      agentId: this.id,
      startedAt,
      completedAt: context.now.toISOString(),
      success: true,
      reasonCodes: ["CAPABILITY_RUNTIME_STATE_RESET"],
      metadata: {
        capabilityRuntimeStatePath: context.config.capabilityRuntimeStatePath,
        targetId,
        previousLocked: current.locked,
      },
    };
  }
}
