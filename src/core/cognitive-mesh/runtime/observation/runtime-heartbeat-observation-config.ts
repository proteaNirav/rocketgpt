import { hostname } from "node:os";
import type {
  RuntimeHeartbeatObservationConfig,
  RuntimeHeartbeatObservationRunInput,
} from "./runtime-heartbeat-observation.types";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
}

function resolveRuntimeId(inputRuntimeId: string | undefined, env: NodeJS.ProcessEnv): string {
  if (inputRuntimeId && inputRuntimeId.trim().length > 0) {
    return inputRuntimeId.trim();
  }
  if (env.RGPT_RUNTIME_ID && env.RGPT_RUNTIME_ID.trim().length > 0) {
    return env.RGPT_RUNTIME_ID.trim();
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

export function resolveRuntimeHeartbeatObservationConfig(
  input: RuntimeHeartbeatObservationRunInput = {}
): RuntimeHeartbeatObservationConfig {
  const env = input.env ?? process.env;
  const smokeMode = input.smoke === true;

  const enabled =
    input.enabled ??
    parseBoolean(env.RGPT_HEARTBEAT_OBSERVATION_ENABLED, false);

  const durationFromMinutes = typeof input.durationMinutes === "number" ? input.durationMinutes * 60_000 : undefined;
  const durationMs = smokeMode
    ? 20_000
    : input.durationMs ??
      durationFromMinutes ??
      parseNumber(env.RGPT_HEARTBEAT_OBSERVATION_DURATION_MS, 2 * 60 * 60 * 1000, 1_000);

  const snapshotIntervalMs = smokeMode
    ? 5_000
    : input.snapshotIntervalMs ??
      parseNumber(env.RGPT_HEARTBEAT_OBSERVATION_SNAPSHOT_INTERVAL_MS, 5 * 60 * 1000, 1_000);

  return {
    enabled,
    durationMs,
    snapshotIntervalMs,
    outputDir: input.outputDir ?? env.RGPT_HEARTBEAT_OBSERVATION_OUTPUT_DIR ?? ".rocketgpt/runtime/observations",
    smokeMode,
    includeMemorySamples: input.includeMemorySamples ?? true,
    runtimeId: resolveRuntimeId(input.runtimeId, env),
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
  };
}
