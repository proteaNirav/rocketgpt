import type {
  RuntimeRepairAction,
  RuntimeRepairAnomalyType,
  RuntimeRepairAttempt,
  RuntimeRepairDiagnosis,
  RuntimeRecoveryValidation,
  RuntimeRepairTargetType,
} from "../repair/runtime-repair.types";

export type RuntimeLearningStatus =
  | "idle"
  | "analysis_pending"
  | "analyzing"
  | "pattern_detected"
  | "root_cause_identified"
  | "recommendations_generated"
  | "analysis_completed"
  | "analysis_skipped";

export type RuntimeFailurePatternCategory =
  | "repeated_stale_heartbeat"
  | "repeated_queue_backlog"
  | "repeated_memory_pressure"
  | "repeated_capability_timeout"
  | "repeated_capability_lock_stuck"
  | "repeated_repair_failure"
  | "repeated_validation_failure"
  | "clustered_failures_same_target"
  | "clustered_failures_same_action"
  | "none";

export type RuntimeRootCauseCategory =
  | "worker_instability"
  | "queue_congestion"
  | "transient_memory_buildup"
  | "stale_runtime_state"
  | "capability_state_locking"
  | "aggressive_retry_pressure"
  | "repeated_repair_ineffectiveness"
  | "unknown_but_recurrent"
  | "none";

export type RuntimeLearningConfidence = "low" | "medium" | "high";

export type RuntimePreventionRecommendationClass =
  | "increase_observation_on_target"
  | "add_cooldown_or_extend_cooldown"
  | "reduce_retry_pressure"
  | "inspect_queue_pressure"
  | "inspect_memory_cleanup_frequency"
  | "inspect_capability_timeout_threshold"
  | "inspect_capability_locking_flow"
  | "escalate_for_containment_consideration"
  | "manual_review_required"
  | "no_recommendation";

export interface RuntimeLearningInput {
  runtimeId?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  diagnosis?: RuntimeRepairDiagnosis | null;
  repairAttempt?: RuntimeRepairAttempt | null;
  validation?: RuntimeRecoveryValidation | null;
  requestId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface RuntimeLearningEvidenceEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  targetType: RuntimeRepairTargetType | "runtime";
  targetId: string | null;
  anomalyType: RuntimeRepairAnomalyType | "unsupported";
  repairAction: RuntimeRepairAction | "no_action";
  repairSuccess: boolean | null;
  validationSuccess: boolean | null;
  reasonCodes: string[];
}

export interface RuntimePatternDetectionResult {
  patternCategory: RuntimeFailurePatternCategory;
  recurrenceDetected: boolean;
  recurrenceCount: number;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeRootCauseResult {
  rootCauseCategory: RuntimeRootCauseCategory;
  confidence: RuntimeLearningConfidence;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimePreventionRecommendationResult {
  recommendationClasses: RuntimePreventionRecommendationClass[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeLearningResult {
  learningId: string;
  analyzedAt: string;
  sourceEventIds: string[];
  targetType: RuntimeRepairTargetType;
  targetId: string | null;
  anomalyType: RuntimeRepairAnomalyType;
  repairAction: RuntimeRepairAction;
  validationOutcome: "succeeded" | "failed" | "unknown";
  patternCategory: RuntimeFailurePatternCategory;
  recurrenceDetected: boolean;
  recurrenceCount: number;
  rootCauseCategory: RuntimeRootCauseCategory;
  confidence: RuntimeLearningConfidence;
  recommendationClasses: RuntimePreventionRecommendationClass[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeLearningCounters {
  totalAnalyses: number;
  totalCompleted: number;
  totalSkipped: number;
  totalRecurrencesDetected: number;
  totalRootCausesIdentified: number;
  totalRecommendationsGenerated: number;
}

export interface RuntimeLearningStateSurface {
  schemaVersion: "rgpt.runtime_repair_learning_state.v1";
  runtimeId: string;
  status: RuntimeLearningStatus;
  lastUpdatedAt: string;
  latestLearningResult: RuntimeLearningResult | null;
  recentPatterns: RuntimePatternDetectionResult[];
  recentRecommendations: RuntimePreventionRecommendationClass[];
  recurrenceCounters: Record<string, number>;
  learningCooldowns: Record<string, string>;
  summaryCounters: RuntimeLearningCounters;
}

export interface RuntimeLearningConfig {
  enabled: boolean;
  lookbackMs: number;
  recurrenceThreshold: number;
  cooldownMs: number;
  maxEvidenceEvents: number;
  statePath: string;
  repairStatePath: string;
  ledgerPath: string;
}

export interface RuntimeLearningEventInput {
  eventType:
    | "runtime_pattern_detected"
    | "runtime_root_cause_identified"
    | "runtime_prevention_recommendation_generated"
    | "runtime_learning_analysis_completed"
    | "runtime_learning_analysis_skipped"
    | "runtime_recurrence_threshold_reached"
    | "runtime_repair_ineffectiveness_detected";
  status: "evaluated" | "completed" | "degraded";
  runtimeId: string;
  learningResult: RuntimeLearningResult | null;
  reasonCodes: string[];
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeLearningCycleResult {
  status: RuntimeLearningStatus;
  skipped: boolean;
  cooldownActive: boolean;
  learningResult: RuntimeLearningResult | null;
  reasonCodes: string[];
  state: RuntimeLearningStateSurface;
}
