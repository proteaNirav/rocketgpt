export type RuntimeHealingAssessment = "healthy" | "watch" | "stressed" | "unstable";

export type RuntimeEvolutionStabilityImpact = "positive" | "neutral" | "negative" | "mixed";

export type RuntimeEvolutionOutcome =
  | "stabilized"
  | "temporarily_stabilized"
  | "failed_to_stabilize"
  | "contained_but_unstable"
  | "retired_from_auto_reintegration";

export type RuntimeEvolutionRecurrenceContext =
  | "isolated"
  | "recurring_same_target"
  | "recurring_same_action"
  | "oscillatory"
  | "clustered_multi_target";

export type RuntimeEvolutionDecisionTaken =
  | "restart_runtime_worker"
  | "recover_queue"
  | "cleanup_memory"
  | "reset_capability_state"
  | "quarantine_capability"
  | "quarantine_worker"
  | "freeze_queue"
  | "recommend_safe_mode_review"
  | "no_action";

export type RuntimeImprovementCandidateCategory =
  | "repeated_ineffective_repair_strategy"
  | "repeated_validation_failure_cluster"
  | "repeated_containment_same_target"
  | "repeated_reintegration_failure"
  | "persistent_oscillation_pattern"
  | "repeated_degradation_trigger_same_cause"
  | "unstable_target_hotspot"
  | "chronic_queue_pressure"
  | "chronic_worker_instability"
  | "chronic_capability_state_instability";

export type RuntimeImprovementCandidateSeverity = "low" | "medium" | "high";

export type RuntimeImprovementReviewClass =
  | "review_repair_strategy"
  | "review_validation_logic"
  | "review_containment_policy"
  | "review_stability_thresholds"
  | "review_target_specific_runtime_design"
  | "consortium_pattern_review"
  | "manual_architecture_review";

export interface RuntimeEvolutionEvidenceWindow {
  startAt: string;
  endAt: string;
  lookbackMs: number;
}

export interface RuntimeEvolutionEvidenceSignal {
  eventId: string;
  timestamp: string;
  eventType: string;
  targetType: "runtime" | "worker" | "queue" | "capability";
  targetId: string;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeHealingTelemetryMetrics {
  repairSuccessRate: number;
  repairFailureRate: number;
  validationSuccessRate: number;
  validationFailureRate: number;
  containmentRate: number;
  reintegrationSuccessRate: number;
  reintegrationFailureRate: number;
  repairLoopFrequency: number;
  oscillationRate: number;
  retirementRate: number;
  degradedBandFrequency: number;
  constrainedOrCriticalFrequency: number;
}

export interface RuntimeHealingTelemetry {
  telemetryId: string;
  analyzedAt: string;
  evidenceWindow: RuntimeEvolutionEvidenceWindow;
  targetType: "runtime" | "worker" | "queue" | "capability" | null;
  targetId: string | null;
  metrics: RuntimeHealingTelemetryMetrics;
  healthAssessment: RuntimeHealingAssessment;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeLearningSignal {
  learningSignalId: string;
  capturedAt: string;
  targetType: "runtime" | "worker" | "queue" | "capability";
  targetId: string;
  signalSequence: string[];
  decisionTaken: RuntimeEvolutionDecisionTaken;
  outcome: RuntimeEvolutionOutcome;
  stabilityImpact: RuntimeEvolutionStabilityImpact;
  recurrenceContext: RuntimeEvolutionRecurrenceContext;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeImprovementCandidate {
  candidateId: string;
  detectedAt: string;
  category: RuntimeImprovementCandidateCategory;
  targetType: "runtime" | "worker" | "queue" | "capability";
  targetId: string;
  severity: RuntimeImprovementCandidateSeverity;
  recurrenceCount: number;
  supportingSignals: string[];
  reasonCodes: string[];
  suggestedReviewClass: RuntimeImprovementReviewClass;
  metadata: Record<string, unknown>;
}

export interface RuntimeEvolutionSummary {
  healingAssessment: RuntimeHealingAssessment;
  learningSignalCount: number;
  improvementCandidateCount: number;
  dominantRiskAreas: string[];
  notableTargets: string[];
}

export interface RuntimeEvolutionEvaluation {
  evolutionEvaluationId: string;
  evaluatedAt: string;
  evidenceWindow: RuntimeEvolutionEvidenceWindow;
  healingTelemetry: RuntimeHealingTelemetry;
  learningSignals: RuntimeLearningSignal[];
  improvementCandidates: RuntimeImprovementCandidate[];
  summary: RuntimeEvolutionSummary;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeEvolutionSummaryCounters {
  totalLearningSignalsCaptured: number;
  totalImprovementCandidatesDetected: number;
  totalHighSeverityCandidates: number;
  totalHealingAssessmentsHealthy: number;
  totalHealingAssessmentsWatch: number;
  totalHealingAssessmentsStressed: number;
  totalHealingAssessmentsUnstable: number;
}

export interface RuntimeEvolutionDedupeState {
  signalCooldowns: Record<string, string>;
  candidateCooldowns: Record<string, string>;
  lastHealingAssessment: RuntimeHealingAssessment | null;
  lastHealingMetricHash: string | null;
}

export interface RuntimeEvolutionSignalsStateSurface {
  schemaVersion: "rgpt.runtime_evolution_signals_state.v1";
  runtimeId: string;
  lastUpdatedAt: string;
  latestEvaluation: RuntimeEvolutionEvaluation | null;
  latestHealingTelemetry: RuntimeHealingTelemetry | null;
  recentLearningSignals: RuntimeLearningSignal[];
  activeImprovementCandidates: RuntimeImprovementCandidate[];
  summaryCounters: RuntimeEvolutionSummaryCounters;
  dedupeState: RuntimeEvolutionDedupeState;
}

export interface RuntimeEvolutionSignalsConfig {
  enabled: boolean;
  lookbackMs: number;
  signalCooldownMs: number;
  candidateCooldownMs: number;
  maxRecentSignals: number;
  maxActiveCandidates: number;
  maxEvidenceEvents: number;
  statePath: string;
  ledgerPath: string;
}

export interface RuntimeEvolutionSignalsOrchestratorInput {
  runtimeId?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  requestId?: string;
  sessionId?: string;
  evidenceSignals?: RuntimeEvolutionEvidenceSignal[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeEvolutionSignalsEventInput {
  eventType:
    | "runtime_healing_telemetry_evaluated"
    | "runtime_learning_signal_captured"
    | "runtime_improvement_candidate_detected"
    | "runtime_evolution_signals_evaluated"
    | "runtime_learning_signal_skipped"
    | "runtime_improvement_candidate_escalated"
    | "runtime_healing_assessment_changed";
  status: "evaluated" | "completed" | "degraded";
  runtimeId: string;
  evaluation: RuntimeEvolutionEvaluation | null;
  healingTelemetry: RuntimeHealingTelemetry | null;
  learningSignal: RuntimeLearningSignal | null;
  improvementCandidate: RuntimeImprovementCandidate | null;
  reasonCodes: string[];
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeEvolutionSignalsCycleResult {
  skipped: boolean;
  reasonCodes: string[];
  evaluation: RuntimeEvolutionEvaluation | null;
  state: RuntimeEvolutionSignalsStateSurface;
}
