import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { runHybridHeartbeatMonitor } from "../hybrid-heartbeat";
import { resolveRuntimeHeartbeatObservationConfig } from "./runtime-heartbeat-observation-config";
import { captureRuntimeHeartbeatObservationSnapshot } from "./runtime-heartbeat-snapshot-capture";
import { buildRuntimeHeartbeatOverheadSummary } from "./runtime-heartbeat-resource-measurer";
import {
  buildRuntimeHeartbeatObservationMarkdownReport,
  buildRuntimeHeartbeatObservationSummary,
} from "./runtime-heartbeat-observation-reporter";
import type {
  RuntimeHeartbeatObservationRunInput,
  RuntimeHeartbeatObservationRunResult,
  RuntimeObservationSessionManifest,
} from "./runtime-heartbeat-observation.types";

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeNow(now?: () => Date): Date {
  return now ? now() : new Date();
}

function createSessionId(at: Date): string {
  return `hb_obs_${at.toISOString().replace(/[-:.TZ]/g, "").slice(0, 17)}`;
}

async function writeJson(path: string, payload: unknown): Promise<number> {
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(path, serialized, "utf8");
  return Buffer.byteLength(serialized, "utf8");
}

function detectNotableAnomalies(input: {
  snapshots: RuntimeHeartbeatObservationRunResult["snapshots"];
}): string[] {
  const out: string[] = [];
  const last = input.snapshots[input.snapshots.length - 1];
  if (!last) {
    return out;
  }
  if (last.eventVolume.repairEventCount > 50) {
    out.push("repair event volume exceeded 50 events in bounded session");
  }
  if (last.eventVolume.containmentEventCount > 20) {
    out.push("containment event volume exceeded 20 events in bounded session");
  }
  if (last.snapshotDurationMs > 800) {
    out.push("snapshot processing latency exceeded 800ms");
  }
  return out;
}

export async function runRuntimeHeartbeatObservationSession(
  input: RuntimeHeartbeatObservationRunInput = {}
): Promise<RuntimeHeartbeatObservationRunResult> {
  const nowProvider = input.now;
  const sleep = input.sleep ?? defaultSleep;
  const config = resolveRuntimeHeartbeatObservationConfig(input);
  const startedAtDate = safeNow(nowProvider);
  const startedAt = startedAtDate.toISOString();

  if (!config.enabled) {
    throw new Error("heartbeat observation mode is disabled; set RGPT_HEARTBEAT_OBSERVATION_ENABLED=true or pass explicit enable flag");
  }

  const sessionId = createSessionId(startedAtDate);
  const sessionDirectory = join(config.outputDir, sessionId);
  const snapshotsDirectory = join(sessionDirectory, "snapshots");
  await mkdir(snapshotsDirectory, { recursive: true });

  const manifest: RuntimeObservationSessionManifest = {
    sessionId,
    startedAt,
    plannedDurationMs: config.durationMs,
    snapshotIntervalMs: config.snapshotIntervalMs,
    outputDirectory: sessionDirectory,
    status: "running",
    reasonCodes: [config.smokeMode ? "SMOKE_MODE" : "FULL_OBSERVATION_MODE"],
    metadata: {
      includeMemorySamples: config.includeMemorySamples,
      runtimeId: config.runtimeId,
      ledgerPath: config.ledgerPath,
    },
  };

  let totalObservationWriteBytes = 0;
  totalObservationWriteBytes += await writeJson(join(sessionDirectory, "session-manifest.json"), manifest);

  const snapshots: RuntimeHeartbeatObservationRunResult["snapshots"] = [];
  const sessionStart = startedAtDate;
  const plannedEndMs = sessionStart.getTime() + config.durationMs;

  let status: RuntimeHeartbeatObservationRunResult["summary"]["status"] = "completed";
  const reasonCodes: string[] = [];

  try {
    let nextSnapshotAtMs = sessionStart.getTime();
    while (safeNow(nowProvider).getTime() <= plannedEndMs) {
      const now = safeNow(nowProvider);
      const nowMs = now.getTime();
      if (nowMs < nextSnapshotAtMs) {
        await sleep(Math.max(1, nextSnapshotAtMs - nowMs));
        continue;
      }

      await runHybridHeartbeatMonitor({
        runtimeId: config.runtimeId,
      });

      const captureStartedAtMs = performance.now();
      const cpuStart = process.cpuUsage();
      const snapshot = await captureRuntimeHeartbeatObservationSnapshot({
        config,
        sessionStart,
        now,
        sessionDirectory,
        includeMemorySamples: config.includeMemorySamples,
        cpuSampleStart: cpuStart,
        captureStartedAtMs,
      });

      snapshots.push(snapshot);
      totalObservationWriteBytes += await writeJson(
        join(snapshotsDirectory, `${snapshot.timestamp.replace(/[:.]/g, "-")}.json`),
        snapshot
      );

      nextSnapshotAtMs += config.snapshotIntervalMs;
      if (config.smokeMode && snapshots.length >= 4) {
        break;
      }
    }
  } catch (error) {
    status = "failed";
    reasonCodes.push("OBSERVATION_SESSION_FAILED");
    reasonCodes.push(String(error));
  }

  const endedAtDate = safeNow(nowProvider);
  const endedAt = endedAtDate.toISOString();
  const actualDurationMs = Math.max(0, endedAtDate.getTime() - sessionStart.getTime());

  const overhead = buildRuntimeHeartbeatOverheadSummary({
    snapshots,
    totalObservationWriteBytes,
    sessionDurationMs: actualDurationMs,
  });

  const notableAnomalies = detectNotableAnomalies({ snapshots });
  const summary = buildRuntimeHeartbeatObservationSummary({
    sessionId,
    startedAt,
    endedAt,
    plannedDurationMs: config.durationMs,
    actualDurationMs,
    snapshotIntervalMs: config.snapshotIntervalMs,
    outputDirectory: sessionDirectory,
    status,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["OBSERVATION_SESSION_COMPLETED"],
    metadata: {
      smokeMode: config.smokeMode,
      runtimeId: config.runtimeId,
    },
    overhead,
    snapshots,
    notableAnomalies,
  });

  const summaryPath = join(sessionDirectory, "observation-summary.json");
  totalObservationWriteBytes += await writeJson(summaryPath, summary);

  const report = buildRuntimeHeartbeatObservationMarkdownReport({
    summary,
    snapshots,
    notableAnomalies,
  });
  const reportPath = join(sessionDirectory, "observation-report.md");
  await writeFile(reportPath, report, "utf8");

  manifest.status = summary.status;
  manifest.reasonCodes = summary.reasonCodes;
  manifest.metadata = {
    ...manifest.metadata,
    snapshotCount: snapshots.length,
    totalObservationWriteBytes,
    summaryPath,
    reportPath,
  };
  await writeJson(join(sessionDirectory, "session-manifest.json"), manifest);

  return {
    manifest,
    snapshots,
    summary,
    summaryPath,
    reportPath,
  };
}
