import type {
  RuntimeHeartbeatObservationOverheadSummary,
  RuntimeHeartbeatObservationSnapshot,
} from "./runtime-heartbeat-observation.types";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function classifyObservationOverhead(input: {
  averageSnapshotDurationMs: number;
  bytesPerHour: number;
  eventsPerHour: number;
}): RuntimeHeartbeatObservationOverheadSummary["overheadAssessment"] {
  if (input.averageSnapshotDurationMs > 600 || input.bytesPerHour > 5_000_000 || input.eventsPerHour > 5000) {
    return "heavy";
  }
  if (input.averageSnapshotDurationMs > 200 || input.bytesPerHour > 1_000_000 || input.eventsPerHour > 1200) {
    return "moderate";
  }
  return "light";
}

export function buildRuntimeHeartbeatOverheadSummary(input: {
  snapshots: RuntimeHeartbeatObservationSnapshot[];
  totalObservationWriteBytes: number;
  sessionDurationMs: number;
}): RuntimeHeartbeatObservationOverheadSummary {
  const durations = input.snapshots.map((snapshot) => snapshot.snapshotDurationMs);
  const writeAvg = input.snapshots.length > 0 ? input.totalObservationWriteBytes / input.snapshots.length : 0;

  const first = input.snapshots[0];
  const last = input.snapshots[input.snapshots.length - 1];
  const estimatedRuntimeArtifactGrowthBytes = first && last
    ? Math.max(0, last.runtimeDirectorySizeBytes - first.runtimeDirectorySizeBytes)
    : 0;

  const durationHours = input.sessionDurationMs > 0 ? input.sessionDurationMs / (60 * 60 * 1000) : 0;
  const eventsPerHour = durationHours > 0 && last ? last.eventVolume.totalEventCount / durationHours : 0;
  const bytesPerHour = durationHours > 0 ? estimatedRuntimeArtifactGrowthBytes / durationHours : 0;

  const avgSnapshotDurationMs = Number(average(durations).toFixed(2));
  const maxSnapshotDurationMs = Number((durations.length > 0 ? Math.max(...durations) : 0).toFixed(2));

  const memorySamples = input.snapshots
    .map((snapshot) => snapshot.memoryUsageSample?.rss)
    .filter((value): value is number => typeof value === "number");
  const cpuSamples = input.snapshots
    .map((snapshot) => {
      if (!snapshot.cpuUsageSample) {
        return null;
      }
      return snapshot.cpuUsageSample.userMicros + snapshot.cpuUsageSample.systemMicros;
    })
    .filter((value): value is number => typeof value === "number");

  const overheadAssessment = classifyObservationOverhead({
    averageSnapshotDurationMs: avgSnapshotDurationMs,
    bytesPerHour,
    eventsPerHour,
  });

  return {
    averageSnapshotDurationMs: avgSnapshotDurationMs,
    maxSnapshotDurationMs,
    averageObservationWriteBytes: Number(writeAvg.toFixed(2)),
    totalObservationWriteBytes: input.totalObservationWriteBytes,
    estimatedRuntimeArtifactGrowthBytes,
    estimatedHeartbeatEventCount: last?.eventVolume.heartbeatEventCount ?? 0,
    estimatedRepairEventCount: last?.eventVolume.repairEventCount ?? 0,
    estimatedContainmentEventCount: last?.eventVolume.containmentEventCount ?? 0,
    estimatedStabilityEventCount: last?.eventVolume.stabilityEventCount ?? 0,
    estimatedEvolutionEventCount: last?.eventVolume.evolutionEventCount ?? 0,
    approximateMemoryUsageSamples: memorySamples,
    approximateCpuUsageSamples: cpuSamples,
    overheadAssessment,
    reasonCodes: [
      overheadAssessment === "heavy" ? "OVERHEAD_HEAVY" : overheadAssessment === "moderate" ? "OVERHEAD_MODERATE" : "OVERHEAD_LIGHT",
      "CPU_SAMPLED_AS_PROCESS_CPU_USAGE_PROXY",
    ],
    metadata: {
      bytesPerHour: Number(bytesPerHour.toFixed(2)),
      eventsPerHour: Number(eventsPerHour.toFixed(2)),
      cpuMeasurementMode: "process_cpu_usage_delta",
    },
  };
}
