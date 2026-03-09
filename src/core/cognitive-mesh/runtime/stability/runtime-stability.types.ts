export type RuntimeStabilityBand = "normal" | "watch" | "degraded" | "constrained" | "critical";

export type RuntimeInstabilityPattern =
  | "repair_oscillation"
  | "contain_reintegrate_oscillation"
  | "repeated_validation_failure"
  | "repeated_repair_failure"
  | "repeated_same_target_instability"
  | "clustered_multi_target_instability"
  | "heartbeat_recovery_flap"
  | "instability_after_reintegration";

export type RuntimeDegradationAction =
  | "no_action"
  | "increase_observation"
  | "reduce_new_work_intake"
  | "prefer_healthy_targets_only"
  | "suppress_repeated_repair_on_unstable_targets"
  | "recommend_safe_mode_review";

export interface RuntimeStabilityEvidenceWindow {
  startAt: string;
  endAt: string;
  lookbackMs: number;
}

export interface RuntimeStabilitySignal {
  eventId: string;
  timestamp: string;
  eventType: string;
  targetType: "worker" | "queue" | "capability" | "runtime";
  targetId: string;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeTargetStabilityEvaluation {
  targetType: "worker" | "queue" | "capability" | "runtime";
  targetId: string;
  stabilityScore: number;
  band: RuntimeStabilityBand;
  instabilityCount: number;
  oscillationDetected: boolean;
  recentSignals: string[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeStabilityEvaluation {
  stabilityEvaluationId: string;
  evaluatedAt: string;
  evidenceWindow: RuntimeStabilityEvidenceWindow;
  targetEvaluations: RuntimeTargetStabilityEvaluation[];
  systemStabilityScore: number;
  systemStabilityBand: RuntimeStabilityBand;
  instabilityPatterns: RuntimeInstabilityPattern[];
  degradationAction: RuntimeDegradationAction;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeStabilitySummaryCounters {
  totalEvaluations: number;
  totalCooldownSkips: number;
  totalPatternDetections: number;
  totalOscillationDetections: number;
  totalDegradationStateChanges: number;
  totalCriticalTriggers: number;
}

export interface RuntimeStabilityStateSurface {
  schemaVersion: "rgpt.runtime_stability_state.v1";
  runtimeId: string;
  lastUpdatedAt: string;
  latestEvaluation: RuntimeStabilityEvaluation | null;
  targetStabilityIndex: Record<string, RuntimeTargetStabilityEvaluation>;
  recentInstabilityPatterns: RuntimeInstabilityPattern[];
  degradationState: {
    band: RuntimeStabilityBand;
    action: RuntimeDegradationAction;
    updatedAt: string;
    changed: boolean;
  };
  evaluationCooldowns: Record<string, string>;
  summaryCounters: RuntimeStabilitySummaryCounters;
}

export interface RuntimeStabilityConfig {
  enabled: boolean;
  lookbackMs: number;
  oscillationThreshold: number;
  multiTargetThreshold: number;
  evaluationCooldownMs: number;
  maxEvidenceEvents: number;
  statePath: string;
  ledgerPath: string;
}

export interface RuntimeStabilityOrchestratorInput {
  runtimeId?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  requestId?: string;
  sessionId?: string;
  evidenceSignals?: RuntimeStabilitySignal[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeStabilityEventInput {
  eventType:
    | "runtime_stability_evaluated"
    | "runtime_instability_pattern_detected"
    | "runtime_oscillation_detected"
    | "runtime_degradation_state_changed"
    | "runtime_degradation_action_recommended"
    | "runtime_stability_watch_triggered"
    | "runtime_stability_critical_triggered";
  status: "evaluated" | "completed" | "degraded";
  runtimeId: string;
  evaluation: RuntimeStabilityEvaluation | null;
  reasonCodes: string[];
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeStabilityCycleResult {
  skipped: boolean;
  cooldownActive: boolean;
  reasonCodes: string[];
  evaluation: RuntimeStabilityEvaluation | null;
  state: RuntimeStabilityStateSurface;
}
