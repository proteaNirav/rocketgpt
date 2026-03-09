import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { performance } from "node:perf_hooks";
import type {
  RuntimeEventVolumeSnapshot,
  RuntimeHeartbeatObservationConfig,
  RuntimeHeartbeatObservationSnapshot,
  RuntimeStateFileSnapshot,
} from "./runtime-heartbeat-observation.types";

const STATE_FILE_DEFS: Array<{ key: RuntimeStateFileSnapshot["key"]; relativePath: string }> = [
  { key: "heartbeat", relativePath: "heartbeat-state.json" },
  { key: "repair", relativePath: "repair-state.json" },
  { key: "repairLearning", relativePath: "repair-learning-state.json" },
  { key: "containment", relativePath: "containment-state.json" },
  { key: "stability", relativePath: "stability-state.json" },
  { key: "evolution", relativePath: "evolution-signals.json" },
];

async function safeFileStat(path: string): Promise<{ exists: boolean; size: number }> {
  try {
    const result = await stat(path);
    return { exists: true, size: result.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

function summarizeStateFile(parsed: unknown): Record<string, unknown> {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }
  const record = parsed as Record<string, unknown>;
  const summary: Record<string, unknown> = {};
  if (typeof record.currentState === "string") {
    summary.currentState = record.currentState;
  }
  if (typeof record.status === "string") {
    summary.status = record.status;
  }
  if (record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)) {
    summary.summaryCounters = record.summaryCounters;
  }
  if (record.degradationState && typeof record.degradationState === "object" && !Array.isArray(record.degradationState)) {
    summary.degradationState = record.degradationState;
  }
  if (record.latestEvaluation && typeof record.latestEvaluation === "object" && !Array.isArray(record.latestEvaluation)) {
    const latest = record.latestEvaluation as Record<string, unknown>;
    summary.latestEvaluation = {
      systemStabilityBand: latest.systemStabilityBand,
      systemStabilityScore: latest.systemStabilityScore,
      healingAssessment: latest.summary && typeof latest.summary === "object" ? (latest.summary as Record<string, unknown>).healingAssessment : undefined,
    };
  }
  return summary;
}

async function readStateFileSnapshot(path: string, key: RuntimeStateFileSnapshot["key"]): Promise<RuntimeStateFileSnapshot> {
  const file = await safeFileStat(path);
  if (!file.exists) {
    return {
      key,
      path,
      exists: false,
      sizeBytes: 0,
      summary: { status: "missing" },
    };
  }

  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return {
      key,
      path,
      exists: true,
      sizeBytes: file.size,
      summary: summarizeStateFile(parsed),
    };
  } catch {
    return {
      key,
      path,
      exists: true,
      sizeBytes: file.size,
      summary: { status: "unreadable" },
    };
  }
}

async function directorySize(path: string): Promise<number> {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        total += await directorySize(full);
      } else if (entry.isFile()) {
        const s = await stat(full);
        total += s.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function isHeartbeatEvent(eventType: string, action: string): boolean {
  return eventType === "runtime.heartbeat" || action.includes("heartbeat");
}

function isRepairEvent(eventType: string): boolean {
  return eventType.startsWith("runtime_repair_") || eventType.startsWith("runtime_recovery_validation");
}

function isContainmentEvent(eventType: string): boolean {
  return eventType.startsWith("runtime_containment") || eventType.startsWith("runtime_quarantine") || eventType.startsWith("runtime_reintegration") || eventType === "runtime_target_retired_from_auto_reintegration";
}

function isStabilityEvent(eventType: string): boolean {
  return eventType.startsWith("runtime_stability") || eventType.startsWith("runtime_instability") || eventType.startsWith("runtime_degradation") || eventType === "runtime_oscillation_detected";
}

function isEvolutionEvent(eventType: string): boolean {
  return eventType.startsWith("runtime_evolution") || eventType.startsWith("runtime_learning_signal") || eventType.startsWith("runtime_improvement_candidate") || eventType.startsWith("runtime_healing_");
}

async function buildEventVolumeSnapshot(ledgerPath: string, sessionStart: Date, at: Date): Promise<RuntimeEventVolumeSnapshot> {
  try {
    const raw = await readFile(ledgerPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

    let heartbeatEventCount = 0;
    let repairEventCount = 0;
    let containmentEventCount = 0;
    let stabilityEventCount = 0;
    let evolutionEventCount = 0;
    let totalEventCount = 0;

    const startMs = sessionStart.getTime();
    const endMs = at.getTime();

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        const ts = Date.parse(String(parsed.timestamp ?? ""));
        if (!Number.isFinite(ts) || ts < startMs || ts > endMs) {
          continue;
        }
        const eventType = String(parsed.eventType ?? "");
        const action = String(parsed.action ?? "");
        totalEventCount += 1;
        if (isHeartbeatEvent(eventType, action)) {
          heartbeatEventCount += 1;
        }
        if (isRepairEvent(eventType)) {
          repairEventCount += 1;
        }
        if (isContainmentEvent(eventType)) {
          containmentEventCount += 1;
        }
        if (isStabilityEvent(eventType)) {
          stabilityEventCount += 1;
        }
        if (isEvolutionEvent(eventType)) {
          evolutionEventCount += 1;
        }
      } catch {
        continue;
      }
    }

    return {
      heartbeatEventCount,
      repairEventCount,
      containmentEventCount,
      stabilityEventCount,
      evolutionEventCount,
      totalEventCount,
    };
  } catch {
    return {
      heartbeatEventCount: 0,
      repairEventCount: 0,
      containmentEventCount: 0,
      stabilityEventCount: 0,
      evolutionEventCount: 0,
      totalEventCount: 0,
    };
  }
}

export async function captureRuntimeHeartbeatObservationSnapshot(input: {
  config: RuntimeHeartbeatObservationConfig;
  sessionStart: Date;
  now: Date;
  sessionDirectory: string;
  runtimeRootDir?: string;
  includeMemorySamples: boolean;
  cpuSampleStart: NodeJS.CpuUsage;
  captureStartedAtMs: number;
}): Promise<RuntimeHeartbeatObservationSnapshot> {
  const runtimeRootDir = input.runtimeRootDir ?? ".rocketgpt/runtime";
  const stateFiles = await Promise.all(
    STATE_FILE_DEFS.map((def) => readStateFileSnapshot(join(runtimeRootDir, def.relativePath), def.key))
  );

  const totalStateSizeBytes = stateFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const runtimeDirectorySizeBytes = await directorySize(runtimeRootDir);
  const observationDirectorySizeBytes = await directorySize(input.sessionDirectory);
  const eventVolume = await buildEventVolumeSnapshot(input.config.ledgerPath, input.sessionStart, input.now);

  const snapshotDurationMs = Number((performance.now() - input.captureStartedAtMs).toFixed(2));
  const cpuUsage = process.cpuUsage(input.cpuSampleStart);

  return {
    snapshotId: `snapshot_${input.now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)}_${basename(input.sessionDirectory)}`,
    timestamp: input.now.toISOString(),
    snapshotDurationMs,
    stateFiles,
    totalStateSizeBytes,
    runtimeDirectorySizeBytes,
    observationDirectorySizeBytes,
    eventVolume,
    memoryUsageSample: input.includeMemorySamples
      ? (() => {
          const memory = process.memoryUsage();
          return {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
          };
        })()
      : null,
    cpuUsageSample: {
      userMicros: cpuUsage.user,
      systemMicros: cpuUsage.system,
    },
    reasonCodes: ["SNAPSHOT_CAPTURED"],
    metadata: {},
  };
}

export async function computeDirectorySizeForObservation(path: string): Promise<number> {
  return directorySize(path);
}
