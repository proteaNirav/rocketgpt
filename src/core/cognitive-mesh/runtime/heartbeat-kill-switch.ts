import { readFile } from "node:fs/promises";

export interface HeartbeatRuntimeKillSwitch {
  heartbeat: boolean;
  runtimeSignals: boolean;
  capabilityDispatch: boolean;
}

export type HeartbeatDecisionReasonCode =
  | "HEARTBEAT_ALLOWED"
  | "ENV_DISABLED"
  | "FILE_DISABLED"
  | "FILE_MISSING_FAIL_SAFE"
  | "FILE_INVALID_FAIL_SAFE"
  | "RATE_LIMIT_EXCEEDED";

export interface HeartbeatRateLimitDecision {
  allowed: boolean;
  reasonCode?: "RATE_LIMIT_EXCEEDED";
  lastHeartbeatAt?: string;
  nextAllowedAt?: string;
}

export interface HeartbeatGateDecision {
  allowed: boolean;
  reasonCodes: HeartbeatDecisionReasonCode[];
  envEnabled: boolean;
  fileEnabled: boolean;
  rateLimitAllowed: boolean;
  killSwitchPath: string;
  metadata: {
    fileState: "loaded" | "missing" | "invalid";
    lastHeartbeatAt?: string;
    nextAllowedAt?: string;
  };
}

export interface HeartbeatGateInput {
  runtimeId: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  killSwitchPath?: string;
  rateLimitGuard?: HeartbeatRateLimitGuard;
}

const DEFAULT_RUNTIME_KILL_SWITCH_PATH = ".rocketgpt/runtime/kill-switch.json";
const DEFAULT_KILL_SWITCH: HeartbeatRuntimeKillSwitch = {
  heartbeat: false,
  runtimeSignals: true,
  capabilityDispatch: true,
};

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readHeartbeatEnvEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return parseBooleanEnv(env.RGPT_HEARTBEAT_ENABLED);
}

export async function readHeartbeatRuntimeKillSwitch(
  filePath = DEFAULT_RUNTIME_KILL_SWITCH_PATH
): Promise<{ config: HeartbeatRuntimeKillSwitch; fileState: "loaded" | "missing" | "invalid" }> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { config: { ...DEFAULT_KILL_SWITCH }, fileState: "invalid" };
    }
    if (typeof parsed.heartbeat !== "boolean") {
      return { config: { ...DEFAULT_KILL_SWITCH }, fileState: "invalid" };
    }
    const config: HeartbeatRuntimeKillSwitch = {
      heartbeat: parsed.heartbeat,
      runtimeSignals: typeof parsed.runtimeSignals === "boolean" ? parsed.runtimeSignals : DEFAULT_KILL_SWITCH.runtimeSignals,
      capabilityDispatch:
        typeof parsed.capabilityDispatch === "boolean" ? parsed.capabilityDispatch : DEFAULT_KILL_SWITCH.capabilityDispatch,
    };
    return { config, fileState: "loaded" };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { config: { ...DEFAULT_KILL_SWITCH }, fileState: "missing" };
    }
    return { config: { ...DEFAULT_KILL_SWITCH }, fileState: "invalid" };
  }
}

export class HeartbeatRateLimitGuard {
  private readonly lastHeartbeatEpochByRuntime = new Map<string, number>();

  constructor(private readonly minIntervalMs = 10_000) {}

  evaluate(runtimeId: string, now = new Date()): HeartbeatRateLimitDecision {
    const nowMs = now.getTime();
    const last = this.lastHeartbeatEpochByRuntime.get(runtimeId);
    if (typeof last === "number" && nowMs - last < this.minIntervalMs) {
      return {
        allowed: false,
        reasonCode: "RATE_LIMIT_EXCEEDED",
        lastHeartbeatAt: new Date(last).toISOString(),
        nextAllowedAt: new Date(last + this.minIntervalMs).toISOString(),
      };
    }
    this.lastHeartbeatEpochByRuntime.set(runtimeId, nowMs);
    return { allowed: true };
  }
}

export async function canRunHeartbeat(input: HeartbeatGateInput): Promise<HeartbeatGateDecision> {
  const now = input.now ?? new Date();
  const envEnabled = readHeartbeatEnvEnabled(input.env);
  const killSwitchPath = input.killSwitchPath ?? DEFAULT_RUNTIME_KILL_SWITCH_PATH;
  const fileResult = await readHeartbeatRuntimeKillSwitch(killSwitchPath);
  const fileEnabled = fileResult.config.heartbeat === true;
  const guard = input.rateLimitGuard ?? new HeartbeatRateLimitGuard();
  const rateLimit =
    envEnabled && fileEnabled
      ? guard.evaluate(input.runtimeId, now)
      : {
          allowed: true,
        };
  const reasonCodes: HeartbeatDecisionReasonCode[] = [];

  if (!envEnabled) {
    reasonCodes.push("ENV_DISABLED");
  }
  if (!fileEnabled) {
    if (fileResult.fileState === "missing") {
      reasonCodes.push("FILE_MISSING_FAIL_SAFE");
    } else if (fileResult.fileState === "invalid") {
      reasonCodes.push("FILE_INVALID_FAIL_SAFE");
    } else {
      reasonCodes.push("FILE_DISABLED");
    }
  }
  if (!rateLimit.allowed) {
    reasonCodes.push("RATE_LIMIT_EXCEEDED");
  }

  const allowed = envEnabled && fileEnabled && rateLimit.allowed;
  if (allowed) {
    reasonCodes.push("HEARTBEAT_ALLOWED");
  }

  return {
    allowed,
    reasonCodes: [...new Set(reasonCodes)],
    envEnabled,
    fileEnabled,
    rateLimitAllowed: rateLimit.allowed,
    killSwitchPath,
    metadata: {
      fileState: fileResult.fileState,
      lastHeartbeatAt: rateLimit.lastHeartbeatAt,
      nextAllowedAt: rateLimit.nextAllowedAt,
    },
  };
}
