import type {
  RuntimeHeartbeatObservationOverheadSummary,
  RuntimeHeartbeatObservationSnapshot,
  RuntimeHeartbeatObservationSummary,
} from "./runtime-heartbeat-observation.types";

function determineSignalNoise(input: {
  snapshots: RuntimeHeartbeatObservationSnapshot[];
  overhead: RuntimeHeartbeatObservationOverheadSummary;
}): RuntimeHeartbeatObservationSummary["signalNoiseAssessment"] {
  const last = input.snapshots[input.snapshots.length - 1];
  if (!last) {
    return "low_noise";
  }
  const heartbeatPerSnapshot = input.snapshots.length > 0
    ? last.eventVolume.heartbeatEventCount / input.snapshots.length
    : 0;

  if (heartbeatPerSnapshot > 20 || input.overhead.overheadAssessment === "heavy") {
    return "high_noise";
  }
  if (heartbeatPerSnapshot > 8 || input.overhead.overheadAssessment === "moderate") {
    return "moderate_noise";
  }
  return "low_noise";
}

function determineRecommendation(input: {
  noise: RuntimeHeartbeatObservationSummary["signalNoiseAssessment"];
  overhead: RuntimeHeartbeatObservationOverheadSummary;
  notableAnomalies: string[];
}): RuntimeHeartbeatObservationSummary["recommendation"] {
  if (input.noise === "high_noise" || input.overhead.overheadAssessment === "heavy") {
    return "too_noisy_or_too_heavy";
  }
  if (input.noise === "moderate_noise" || input.notableAnomalies.length > 0) {
    return "safe_with_tuning";
  }
  return "safe_to_keep_controlled_heartbeat_on";
}

export function buildRuntimeHeartbeatObservationSummary(input: {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  plannedDurationMs: number;
  actualDurationMs: number;
  snapshotIntervalMs: number;
  outputDirectory: string;
  status: RuntimeHeartbeatObservationSummary["status"];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
  overhead: RuntimeHeartbeatObservationOverheadSummary;
  snapshots: RuntimeHeartbeatObservationSnapshot[];
  notableAnomalies: string[];
}): RuntimeHeartbeatObservationSummary {
  const noise = determineSignalNoise({ snapshots: input.snapshots, overhead: input.overhead });
  const recommendation = determineRecommendation({
    noise,
    overhead: input.overhead,
    notableAnomalies: input.notableAnomalies,
  });

  return {
    sessionId: input.sessionId,
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    plannedDurationMs: input.plannedDurationMs,
    actualDurationMs: input.actualDurationMs,
    snapshotIntervalMs: input.snapshotIntervalMs,
    snapshotCount: input.snapshots.length,
    outputDirectory: input.outputDirectory,
    status: input.status,
    reasonCodes: input.reasonCodes,
    metadata: input.metadata,
    overhead: input.overhead,
    signalNoiseAssessment: noise,
    recommendation,
  };
}

export function buildRuntimeHeartbeatObservationMarkdownReport(input: {
  summary: RuntimeHeartbeatObservationSummary;
  snapshots: RuntimeHeartbeatObservationSnapshot[];
  notableAnomalies: string[];
}): string {
  const last = input.snapshots[input.snapshots.length - 1];

  return [
    "# Runtime Heartbeat Observation Report",
    "",
    "## Session Overview",
    `- Session ID: ${input.summary.sessionId}`,
    `- Status: ${input.summary.status}`,
    `- Started: ${input.summary.startedAt}`,
    `- Ended: ${input.summary.endedAt}`,
    `- Planned Duration (ms): ${input.summary.plannedDurationMs}`,
    `- Actual Duration (ms): ${input.summary.actualDurationMs}`,
    `- Snapshot Interval (ms): ${input.summary.snapshotIntervalMs}`,
    `- Snapshot Count: ${input.summary.snapshotCount}`,
    "",
    "## Storage Growth",
    `- Estimated runtime artifact growth (bytes): ${input.summary.overhead.estimatedRuntimeArtifactGrowthBytes}`,
    `- Total observation write bytes: ${input.summary.overhead.totalObservationWriteBytes}`,
    `- Average observation write bytes: ${input.summary.overhead.averageObservationWriteBytes}`,
    "",
    "## Event Volume",
    `- Heartbeat events: ${input.summary.overhead.estimatedHeartbeatEventCount}`,
    `- Repair events: ${input.summary.overhead.estimatedRepairEventCount}`,
    `- Containment events: ${input.summary.overhead.estimatedContainmentEventCount}`,
    `- Stability events: ${input.summary.overhead.estimatedStabilityEventCount}`,
    `- Evolution events: ${input.summary.overhead.estimatedEvolutionEventCount}`,
    `- Total events observed: ${last?.eventVolume.totalEventCount ?? 0}`,
    "",
    "## Overhead Summary",
    `- Average snapshot duration (ms): ${input.summary.overhead.averageSnapshotDurationMs}`,
    `- Max snapshot duration (ms): ${input.summary.overhead.maxSnapshotDurationMs}`,
    `- Overhead assessment: ${input.summary.overhead.overheadAssessment}`,
    "",
    "## Notable Anomalies",
    ...(input.notableAnomalies.length > 0 ? input.notableAnomalies.map((item) => `- ${item}`) : ["- None detected in bounded observation window."]),
    "",
    "## Signal-Noise Assessment",
    `- ${input.summary.signalNoiseAssessment}`,
    "",
    "## Recommendation",
    `- ${input.summary.recommendation}`,
    "",
  ].join("\n");
}
