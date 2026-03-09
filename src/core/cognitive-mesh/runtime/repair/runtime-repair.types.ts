export type RuntimeRepairAnomalyType =
  | "stale_heartbeat"
  | "queue_backlog"
  | "memory_pressure"
  | "capability_timeout"
  | "capability_lock_stuck"
  | "unsupported";

export type RuntimeRepairSeverity = "low" | "medium" | "high" | "critical";

export type RuntimeRepairTargetType = "runtime" | "worker" | "queue" | "capability" | "memory";

export type RuntimeRepairAction = "restart_runtime_worker" | "recover_queue" | "cleanup_memory" | "reset_capability_state" | "no_action";

export type RuntimeRepairStatus =
  | "idle"
  | "diagnosis_pending"
  | "diagnosed"
  | "repair_dispatched"
  | "repair_in_progress"
  | "repair_succeeded"
  | "repair_failed"
  | "validation_in_progress"
  | "validation_succeeded"
  | "validation_failed"
  | "cooldown";

export interface RuntimeDiagnosisInput {
  runtimeId?: string;
  source: string;
  detectedAt?: string;
  anomalyType?: RuntimeRepairAnomalyType;
  severity?: RuntimeRepairSeverity;
  likelyTargetId?: string | null;
  reasonCodes?: string[];
  metadata?: Record<string, unknown>;
  heartbeatState?: "healthy" | "degraded" | "blocked" | "stale" | "failed" | "unknown";
}

export interface RuntimeRepairDiagnosis {
  diagnosisId: string;
  detectedAt: string;
  source: string;
  anomalyType: RuntimeRepairAnomalyType;
  severity: RuntimeRepairSeverity;
  repairable: boolean;
  likelyTargetType: RuntimeRepairTargetType;
  likelyTargetId: string | null;
  recommendedRepairAction: RuntimeRepairAction;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeRepairAttempt {
  attemptId: string;
  startedAt: string;
  completedAt: string;
  targetType: RuntimeRepairTargetType;
  targetId: string | null;
  anomalyType: RuntimeRepairAnomalyType;
  repairAction: RuntimeRepairAction;
  success: boolean;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeRecoveryValidationCheck {
  checkId: string;
  success: boolean;
  detail: string;
}

export interface RuntimeRecoveryValidation {
  validationId: string;
  startedAt: string;
  completedAt: string;
  targetType: RuntimeRepairTargetType;
  targetId: string | null;
  repairAction: RuntimeRepairAction;
  success: boolean;
  checks: RuntimeRecoveryValidationCheck[];
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeRepairCooldownEntry {
  key: string;
  targetType: RuntimeRepairTargetType;
  targetId: string | null;
  repairAction: RuntimeRepairAction;
  lastAttemptAt: string;
  cooldownUntil: string;
  attemptsInWindow: number;
  windowStartedAt: string;
}

export interface RuntimeRepairSummaryCounters {
  totalDiagnoses: number;
  totalRepairsAttempted: number;
  totalRepairsSucceeded: number;
  totalRepairsFailed: number;
  totalRepairsSkipped: number;
  totalValidationsSucceeded: number;
  totalValidationsFailed: number;
  totalCooldownSkips: number;
}

export interface RuntimeRepairStateSurface {
  schemaVersion: "rgpt.runtime_repair_state.v1";
  runtimeId: string;
  status: RuntimeRepairStatus;
  lastUpdatedAt: string;
  latestDiagnosis: RuntimeRepairDiagnosis | null;
  latestRepairAttempt: RuntimeRepairAttempt | null;
  latestValidation: RuntimeRecoveryValidation | null;
  perTargetCooldowns: Record<string, RuntimeRepairCooldownEntry>;
  summaryCounters: RuntimeRepairSummaryCounters;
}

export interface RuntimeRepairConfig {
  enabled: boolean;
  cooldownMs: number;
  maxAttemptsWithinWindow: number;
  attemptWindowMs: number;
  validationWindowMs: number;
  statePath: string;
  transientMemoryPath: string;
  capabilityRuntimeStatePath: string;
  queueRecoveryStatePath: string;
  restartStatePath: string;
}

export interface RuntimeRepairAgentExecutionContext {
  runtimeId: string;
  now: Date;
  diagnosis: RuntimeRepairDiagnosis;
  config: RuntimeRepairConfig;
}

export interface RuntimeRepairAgentResult {
  agentId: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface RuntimeRepairOrchestratorInput {
  runtimeId?: string;
  source?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  anomalyType?: RuntimeRepairAnomalyType;
  severity?: RuntimeRepairSeverity;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  reasonCodes?: string[];
  requestId?: string;
  sessionId?: string;
}

export interface RuntimeRepairCycleResult {
  status: RuntimeRepairStatus;
  diagnosis: RuntimeRepairDiagnosis | null;
  repairAttempt: RuntimeRepairAttempt | null;
  validation: RuntimeRecoveryValidation | null;
  skipped: boolean;
  cooldownActive: boolean;
  reasonCodes: string[];
  state: RuntimeRepairStateSurface;
}

export interface RuntimeRepairEventInput {
  eventType:
    | "runtime_repair_diagnosed"
    | "runtime_repair_attempted"
    | "runtime_repair_succeeded"
    | "runtime_repair_failed"
    | "runtime_recovery_validation_started"
    | "runtime_recovery_validation_succeeded"
    | "runtime_recovery_validation_failed"
    | "runtime_repair_skipped"
    | "runtime_repair_cooldown_active";
  status: "evaluated" | "started" | "completed" | "failed" | "degraded";
  runtimeId: string;
  diagnosis: RuntimeRepairDiagnosis | null;
  attempt: RuntimeRepairAttempt | null;
  validation: RuntimeRecoveryValidation | null;
  reasonCodes: string[];
  requestId?: string;
  sessionId?: string;
}
