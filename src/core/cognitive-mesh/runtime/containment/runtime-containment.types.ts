import type {
  RuntimeRepairAction,
  RuntimeRepairAnomalyType,
  RuntimeRepairAttempt,
  RuntimeRepairDiagnosis,
  RuntimeRecoveryValidation,
} from "../repair/runtime-repair.types";
import type {
  RuntimeLearningResult,
  RuntimePreventionRecommendationClass,
} from "../repair-learning/runtime-repair-learning.types";

export type RuntimeContainmentTargetType = "capability" | "worker" | "queue";

export type RuntimeContainmentTriggerCategory =
  | "repeated_anomaly"
  | "repeated_repair_failure"
  | "repeated_validation_failure"
  | "learning_escalation"
  | "local_cascade_risk"
  | "none";

export type RuntimeContainmentAction =
  | "quarantine_capability"
  | "quarantine_worker"
  | "freeze_queue"
  | "no_containment";

export type RuntimeContainmentRiskLevel = "low" | "medium" | "high";

export type RuntimeContainmentStatus =
  | "healthy"
  | "suspected"
  | "contained"
  | "under_repair"
  | "recovery_validation"
  | "observation"
  | "reintegrated"
  | "retired";

export interface RuntimeContainmentDecision {
  containmentDecisionId: string;
  decidedAt: string;
  source: string;
  targetType: RuntimeContainmentTargetType;
  targetId: string;
  triggerCategory: RuntimeContainmentTriggerCategory;
  containmentAction: RuntimeContainmentAction;
  shouldContain: boolean;
  riskLevel: RuntimeContainmentRiskLevel;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeContainmentEvidenceEvent {
  eventId: string;
  timestamp: string;
  eventType: string;
  targetType: RuntimeContainmentTargetType;
  targetId: string;
  anomalyType: RuntimeRepairAnomalyType | "unsupported";
  repairAction: RuntimeRepairAction | "no_action";
  repairSuccess: boolean | null;
  validationSuccess: boolean | null;
  recommendationClasses: RuntimePreventionRecommendationClass[];
  reasonCodes: string[];
}

export interface RuntimeContainmentDetectorInput {
  now: Date;
  lookbackMs: number;
  recurrenceThreshold: number;
  anomalyType: RuntimeRepairAnomalyType;
  targetType: RuntimeContainmentTargetType;
  targetId: string;
  recommendationClasses: RuntimePreventionRecommendationClass[];
  evidenceEvents: RuntimeContainmentEvidenceEvent[];
}

export interface RuntimeContainmentDetectionResult {
  triggerCategory: RuntimeContainmentTriggerCategory;
  shouldContain: boolean;
  riskLevel: RuntimeContainmentRiskLevel;
  recurrenceCount: number;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeContainmentPolicyInput {
  anomalyType: RuntimeRepairAnomalyType;
  targetType: RuntimeContainmentTargetType;
  triggerCategory: RuntimeContainmentTriggerCategory;
  riskLevel: RuntimeContainmentRiskLevel;
  shouldContain: boolean;
}

export interface RuntimeContainmentPolicyResult {
  containmentAction: RuntimeContainmentAction;
  shouldContain: boolean;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeActiveContainmentEntry {
  targetType: RuntimeContainmentTargetType;
  targetId: string;
  containmentAction: RuntimeContainmentAction;
  status: RuntimeContainmentStatus;
  triggerCategory: RuntimeContainmentTriggerCategory;
  riskLevel: RuntimeContainmentRiskLevel;
  startedAt: string;
  updatedAt: string;
  repairCorrelationId: string | null;
  validationCorrelationId: string | null;
  observationUntil: string | null;
  reintegrationFailures: number;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeContainmentHistoryEntry {
  eventAt: string;
  status: RuntimeContainmentStatus;
  containmentAction: RuntimeContainmentAction;
  triggerCategory: RuntimeContainmentTriggerCategory;
  reasonCodes: string[];
}

export interface RuntimeContainmentSummaryCounters {
  totalDecisions: number;
  totalContainmentsApplied: number;
  totalContainmentsSkipped: number;
  totalCooldownSkips: number;
  totalReintegrationStarted: number;
  totalReintegrationsCompleted: number;
  totalReintegrationsFailed: number;
  totalRetired: number;
}

export interface RuntimeContainmentStateSurface {
  schemaVersion: "rgpt.runtime_containment_state.v1";
  runtimeId: string;
  lastUpdatedAt: string;
  activeContainments: RuntimeActiveContainmentEntry[];
  latestDecision: RuntimeContainmentDecision | null;
  latestReintegration: RuntimeActiveContainmentEntry | null;
  perTargetContainmentHistory: Record<string, RuntimeContainmentHistoryEntry[]>;
  observationWindows: Record<string, string>;
  decisionCooldowns: Record<string, string>;
  summaryCounters: RuntimeContainmentSummaryCounters;
}

export interface RuntimeContainmentConfig {
  enabled: boolean;
  lookbackMs: number;
  recurrenceThreshold: number;
  cooldownMs: number;
  observationMs: number;
  maxReintegrationFailures: number;
  maxEvidenceEvents: number;
  statePath: string;
  ledgerPath: string;
  repairStatePath: string;
  learningStatePath: string;
}

export interface RuntimeContainmentOrchestratorInput {
  runtimeId?: string;
  source?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  anomalyType?: RuntimeRepairAnomalyType;
  targetType?: RuntimeContainmentTargetType;
  targetId?: string;
  diagnosis?: RuntimeRepairDiagnosis | null;
  repairAttempt?: RuntimeRepairAttempt | null;
  validation?: RuntimeRecoveryValidation | null;
  learningResult?: RuntimeLearningResult | null;
  evidenceEvents?: RuntimeContainmentEvidenceEvent[];
  reasonCodes?: string[];
  metadata?: Record<string, unknown>;
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeContainmentEventInput {
  eventType:
    | "runtime_containment_triggered"
    | "runtime_quarantine_applied"
    | "runtime_quarantine_skipped"
    | "runtime_quarantine_extended"
    | "runtime_reintegration_started"
    | "runtime_reintegration_observation_started"
    | "runtime_reintegration_completed"
    | "runtime_reintegration_failed"
    | "runtime_cascade_risk_detected"
    | "runtime_target_retired_from_auto_reintegration";
  status: "evaluated" | "started" | "completed" | "failed" | "degraded";
  runtimeId: string;
  decision: RuntimeContainmentDecision | null;
  activeContainment: RuntimeActiveContainmentEntry | null;
  reasonCodes: string[];
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeContainmentCycleResult {
  decision: RuntimeContainmentDecision | null;
  activeContainment: RuntimeActiveContainmentEntry | null;
  skipped: boolean;
  cooldownActive: boolean;
  reasonCodes: string[];
  state: RuntimeContainmentStateSurface;
}

export interface RuntimeContainmentEligibilityDecision {
  eligible: boolean;
  status: RuntimeContainmentStatus;
  reasonCodes: string[];
  containment: RuntimeActiveContainmentEntry | null;
}
