export interface RuntimeHeartbeatObservationConfig {
  enabled: boolean;
  durationMs: number;
  snapshotIntervalMs: number;
  outputDir: string;
  smokeMode: boolean;
  includeMemorySamples: boolean;
  runtimeId: string;
  ledgerPath: string;
}

export interface RuntimeObservationSessionManifest {
  sessionId: string;
  startedAt: string;
  plannedDurationMs: number;
  snapshotIntervalMs: number;
  outputDirectory: string;
  status: "running" | "completed" | "aborted" | "failed";
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeStateFileSnapshot {
  key: "heartbeat" | "repair" | "repairLearning" | "containment" | "stability" | "evolution";
  path: string;
  exists: boolean;
  sizeBytes: number;
  summary: Record<string, unknown>;
}

export interface RuntimeEventVolumeSnapshot {
  heartbeatEventCount: number;
  repairEventCount: number;
  containmentEventCount: number;
  stabilityEventCount: number;
  evolutionEventCount: number;
  totalEventCount: number;
}

export interface RuntimeHeartbeatObservationSnapshot {
  snapshotId: string;
  timestamp: string;
  snapshotDurationMs: number;
  stateFiles: RuntimeStateFileSnapshot[];
  totalStateSizeBytes: number;
  runtimeDirectorySizeBytes: number;
  observationDirectorySizeBytes: number;
  eventVolume: RuntimeEventVolumeSnapshot;
  memoryUsageSample: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  } | null;
  cpuUsageSample: {
    userMicros: number;
    systemMicros: number;
  } | null;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeHeartbeatObservationOverheadSummary {
  averageSnapshotDurationMs: number;
  maxSnapshotDurationMs: number;
  averageObservationWriteBytes: number;
  totalObservationWriteBytes: number;
  estimatedRuntimeArtifactGrowthBytes: number;
  estimatedHeartbeatEventCount: number;
  estimatedRepairEventCount: number;
  estimatedContainmentEventCount: number;
  estimatedStabilityEventCount: number;
  estimatedEvolutionEventCount: number;
  approximateMemoryUsageSamples: number[];
  approximateCpuUsageSamples: number[];
  overheadAssessment: "light" | "moderate" | "heavy";
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeHeartbeatObservationSummary {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  plannedDurationMs: number;
  actualDurationMs: number;
  snapshotIntervalMs: number;
  snapshotCount: number;
  outputDirectory: string;
  status: "completed" | "aborted" | "failed";
  reasonCodes: string[];
  metadata: Record<string, unknown>;
  overhead: RuntimeHeartbeatObservationOverheadSummary;
  signalNoiseAssessment: "low_noise" | "moderate_noise" | "high_noise";
  recommendation: "safe_to_keep_controlled_heartbeat_on" | "safe_with_tuning" | "too_noisy_or_too_heavy";
}

export interface RuntimeHeartbeatObservationRunResult {
  manifest: RuntimeObservationSessionManifest;
  snapshots: RuntimeHeartbeatObservationSnapshot[];
  summary: RuntimeHeartbeatObservationSummary;
  summaryPath: string;
  reportPath: string;
}

export interface RuntimeHeartbeatObservationRunInput {
  durationMs?: number;
  durationMinutes?: number;
  snapshotIntervalMs?: number;
  outputDir?: string;
  runtimeId?: string;
  smoke?: boolean;
  includeMemorySamples?: boolean;
  enabled?: boolean;
  env?: NodeJS.ProcessEnv;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
}
