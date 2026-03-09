import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { DispatchGuard } from "../dispatch-guard";
import { getExecutionLedger, type ExecutionLedger } from "../execution-ledger";
import { RuntimeGuard } from "../runtime-guard";
import { RuntimeDiagnosisEngine } from "./runtime-diagnosis-engine";
import { RecoveryValidator } from "./recovery-validator";
import { emitRuntimeRepairLedgerEvent } from "./runtime-repair-event-emitter";
import {
  RuntimeRepairStateRepository,
  createInitialRuntimeRepairState,
} from "./runtime-repair-state-repository";
import type {
  RuntimeRepairAgentResult,
  RuntimeRepairAnomalyType,
  RuntimeRepairAttempt,
  RuntimeRepairConfig,
  RuntimeRepairCooldownEntry,
  RuntimeRepairCycleResult,
  RuntimeRepairOrchestratorInput,
  RuntimeRepairSeverity,
  RuntimeRepairStateSurface,
} from "./runtime-repair.types";
import { CapabilityResetAgent } from "./repair-agents/capability-reset-agent";
import { MemoryCleanupAgent } from "./repair-agents/memory-cleanup-agent";
import { QueueRecoveryAgent } from "./repair-agents/queue-recovery-agent";
import { RestartRepairAgent } from "./repair-agents/restart-repair-agent";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number, min: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
}

function resolveRuntimeId(inputRuntimeId: string | undefined, env: NodeJS.ProcessEnv): string {
  if (inputRuntimeId && inputRuntimeId.trim().length > 0) {
    return inputRuntimeId.trim();
  }
  if (env.RGPT_RUNTIME_ID && env.RGPT_RUNTIME_ID.trim().length > 0) {
    return env.RGPT_RUNTIME_ID.trim();
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function createRepairConfig(env: NodeJS.ProcessEnv): RuntimeRepairConfig {
  return {
    enabled: parseBoolean(env.RGPT_RUNTIME_REPAIR_ENABLED, true),
    cooldownMs: parseNumber(env.RGPT_RUNTIME_REPAIR_COOLDOWN_MS, 120_000, 1000),
    maxAttemptsWithinWindow: parseNumber(env.RGPT_RUNTIME_REPAIR_MAX_ATTEMPTS_WITHIN_WINDOW, 2, 1),
    attemptWindowMs: parseNumber(env.RGPT_RUNTIME_REPAIR_ATTEMPT_WINDOW_MS, 600_000, 1000),
    validationWindowMs: parseNumber(env.RGPT_RUNTIME_REPAIR_VALIDATION_WINDOW_MS, 180_000, 1000),
    statePath: env.RGPT_RUNTIME_REPAIR_STATE_PATH ?? ".rocketgpt/runtime/repair-state.json",
    transientMemoryPath: env.RGPT_RUNTIME_TRANSIENT_MEMORY_PATH ?? ".rocketgpt/runtime/transient-memory-cache.json",
    capabilityRuntimeStatePath: env.RGPT_CAPABILITY_RUNTIME_STATE_PATH ?? ".rocketgpt/runtime/capability-runtime-state.json",
    queueRecoveryStatePath: env.RGPT_RUNTIME_QUEUE_RECOVERY_STATE_PATH ?? ".rocketgpt/runtime/queue-recovery-state.json",
    restartStatePath: env.RGPT_RUNTIME_RESTART_STATE_PATH ?? ".rocketgpt/runtime/restart-state.json",
  };
}

function buildCooldownKey(action: string, targetType: string, targetId: string | null): string {
  return `${action}:${targetType}:${targetId ?? "global"}`;
}

function updateCountersForSkip(state: RuntimeRepairStateSurface, cooldown: boolean): void {
  state.summaryCounters.totalRepairsSkipped += 1;
  if (cooldown) {
    state.summaryCounters.totalCooldownSkips += 1;
  }
}

function evaluateCooldown(
  state: RuntimeRepairStateSurface,
  cooldownKey: string,
  now: Date,
  config: RuntimeRepairConfig
): { active: boolean; reason: string | null; entry: RuntimeRepairCooldownEntry | null } {
  const entry = state.perTargetCooldowns[cooldownKey];
  if (!entry) {
    return { active: false, reason: null, entry: null };
  }

  const nowMs = now.getTime();
  const cooldownUntilMs = Date.parse(entry.cooldownUntil);
  if (Number.isFinite(cooldownUntilMs) && nowMs < cooldownUntilMs) {
    return { active: true, reason: "COOLDOWN_ACTIVE", entry };
  }

  const windowStartedMs = Date.parse(entry.windowStartedAt);
  if (Number.isFinite(windowStartedMs) && nowMs - windowStartedMs <= config.attemptWindowMs) {
    if (entry.attemptsInWindow >= config.maxAttemptsWithinWindow) {
      return { active: true, reason: "MAX_ATTEMPTS_WITHIN_WINDOW", entry };
    }
  }

  return { active: false, reason: null, entry };
}

function applyCooldownAttempt(
  state: RuntimeRepairStateSurface,
  input: {
    key: string;
    now: Date;
    targetType: RuntimeRepairCooldownEntry["targetType"];
    targetId: string | null;
    action: RuntimeRepairCooldownEntry["repairAction"];
    config: RuntimeRepairConfig;
  }
): RuntimeRepairCooldownEntry {
  const nowIso = input.now.toISOString();
  const nowMs = input.now.getTime();
  const current = state.perTargetCooldowns[input.key];

  let attemptsInWindow = 1;
  let windowStartedAt = nowIso;
  if (current) {
    const prevWindowMs = Date.parse(current.windowStartedAt);
    if (Number.isFinite(prevWindowMs) && nowMs - prevWindowMs <= input.config.attemptWindowMs) {
      attemptsInWindow = current.attemptsInWindow + 1;
      windowStartedAt = current.windowStartedAt;
    }
  }

  const next: RuntimeRepairCooldownEntry = {
    key: input.key,
    targetType: input.targetType,
    targetId: input.targetId,
    repairAction: input.action,
    lastAttemptAt: nowIso,
    cooldownUntil: new Date(nowMs + input.config.cooldownMs).toISOString(),
    attemptsInWindow,
    windowStartedAt,
  };
  state.perTargetCooldowns[input.key] = next;
  return next;
}

function toAttempt(
  diagnosisId: string,
  now: Date,
  action: RuntimeRepairAttempt["repairAction"],
  anomalyType: RuntimeRepairAttempt["anomalyType"],
  targetType: RuntimeRepairAttempt["targetType"],
  targetId: string | null,
  agentResult: RuntimeRepairAgentResult
): RuntimeRepairAttempt {
  const startedAt = now.toISOString();
  return {
    attemptId: hashId("repair", { diagnosisId, startedAt, action, targetType, targetId }),
    startedAt,
    completedAt: agentResult.completedAt,
    targetType,
    targetId,
    anomalyType,
    repairAction: action,
    success: agentResult.success,
    reasonCodes: [...agentResult.reasonCodes],
    metadata: { ...agentResult.metadata, agentId: agentResult.agentId },
  };
}

export class RuntimeRepairOrchestrator {
  private readonly diagnosisEngine = new RuntimeDiagnosisEngine();
  private readonly validator = new RecoveryValidator();
  private readonly runtimeGuard = new RuntimeGuard();
  private readonly dispatchGuard = new DispatchGuard();
  private readonly restartAgent = new RestartRepairAgent();
  private readonly queueRecoveryAgent = new QueueRecoveryAgent();
  private readonly memoryCleanupAgent = new MemoryCleanupAgent();
  private readonly capabilityResetAgent = new CapabilityResetAgent();

  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  async run(input: RuntimeRepairOrchestratorInput = {}): Promise<RuntimeRepairCycleResult> {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const env = input.env ?? process.env;
    const config = createRepairConfig(env);
    const runtimeId = resolveRuntimeId(input.runtimeId, env);
    const source = input.source ?? "runtime_repair_orchestrator";

    const stateRepository = new RuntimeRepairStateRepository(config.statePath);
    const state = await stateRepository.read(runtimeId, nowIso);
    if (!state.runtimeId || state.runtimeId === "unknown") {
      state.runtimeId = runtimeId;
    }
    state.lastUpdatedAt = nowIso;
    state.status = "diagnosis_pending";

    if (!config.enabled) {
      state.status = "idle";
      updateCountersForSkip(state, false);
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_skipped",
        status: "evaluated",
        runtimeId,
        diagnosis: null,
        attempt: null,
        validation: null,
        reasonCodes: ["RUNTIME_REPAIR_DISABLED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "idle",
        diagnosis: null,
        repairAttempt: null,
        validation: null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: ["RUNTIME_REPAIR_DISABLED"],
        state,
      };
    }

    const heartbeatStateValue = input.metadata?.heartbeatState;
    const heartbeatState =
      heartbeatStateValue === "healthy" ||
      heartbeatStateValue === "degraded" ||
      heartbeatStateValue === "blocked" ||
      heartbeatStateValue === "stale" ||
      heartbeatStateValue === "failed" ||
      heartbeatStateValue === "unknown"
        ? heartbeatStateValue
        : undefined;

    const diagnosis = this.diagnosisEngine.diagnose({
      runtimeId,
      source,
      detectedAt: nowIso,
      anomalyType: input.anomalyType,
      severity: input.severity as RuntimeRepairSeverity | undefined,
      likelyTargetId: input.targetId,
      reasonCodes: input.reasonCodes,
      metadata: input.metadata,
      heartbeatState,
    });

    state.latestDiagnosis = diagnosis;
    state.summaryCounters.totalDiagnoses += 1;
    state.status = "diagnosed";
    state.lastUpdatedAt = nowIso;

    emitRuntimeRepairLedgerEvent(this.ledger, {
      eventType: "runtime_repair_diagnosed",
      status: "evaluated",
      runtimeId,
      diagnosis,
      attempt: null,
      validation: null,
      reasonCodes: diagnosis.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    if (!diagnosis.repairable || diagnosis.recommendedRepairAction === "no_action") {
      state.status = "idle";
      updateCountersForSkip(state, false);
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_skipped",
        status: "evaluated",
        runtimeId,
        diagnosis,
        attempt: null,
        validation: null,
        reasonCodes: [...diagnosis.reasonCodes, "NO_REPAIR_ACTION"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "idle",
        diagnosis,
        repairAttempt: null,
        validation: null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: [...diagnosis.reasonCodes, "NO_REPAIR_ACTION"],
        state,
      };
    }

    const runtimeGuardDecision = this.runtimeGuard.evaluate({
      actionType: "cognitive_mesh_execution",
      source: "runtime_repair_orchestrator",
      target: diagnosis.recommendedRepairAction,
      requestedOperation: "runtime_repair_execute",
      policyFlags: {
        explicitDeny: parseBoolean(env.RGPT_RUNTIME_REPAIR_POLICY_DENY, false),
      },
      ids: {
        requestId: input.requestId,
      },
    });

    if (!runtimeGuardDecision.allowed) {
      state.status = "idle";
      updateCountersForSkip(state, false);
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_skipped",
        status: "degraded",
        runtimeId,
        diagnosis,
        attempt: null,
        validation: null,
        reasonCodes: runtimeGuardDecision.reasons.map((reason) => `RUNTIME_GUARD_${reason.code}`),
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "idle",
        diagnosis,
        repairAttempt: null,
        validation: null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: runtimeGuardDecision.reasons.map((reason) => `RUNTIME_GUARD_${reason.code}`),
        state,
      };
    }

    const dispatchGuardDecision = this.dispatchGuard.evaluate({
      category: "workflow_step_dispatch",
      source: "runtime_repair_orchestrator",
      sourceType: "runtime",
      target: diagnosis.recommendedRepairAction,
      targetKind: "internal",
      route: `runtime_repair:${diagnosis.recommendedRepairAction}`,
      mode: "sync",
      targetTrustHint: "trusted",
      targetHealthHint: "healthy",
      policyFlags: {
        explicitDeny: parseBoolean(env.RGPT_RUNTIME_REPAIR_DISPATCH_DENY, false),
      },
      ids: {
        requestId: input.requestId,
        correlationId: input.requestId,
      },
      protectedDispatch: true,
    });

    if (!dispatchGuardDecision.allowed) {
      state.status = "idle";
      updateCountersForSkip(state, false);
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_skipped",
        status: "degraded",
        runtimeId,
        diagnosis,
        attempt: null,
        validation: null,
        reasonCodes: dispatchGuardDecision.reasons.map((reason) => `DISPATCH_GUARD_${reason.code}`),
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "idle",
        diagnosis,
        repairAttempt: null,
        validation: null,
        skipped: true,
        cooldownActive: false,
        reasonCodes: dispatchGuardDecision.reasons.map((reason) => `DISPATCH_GUARD_${reason.code}`),
        state,
      };
    }

    const cooldownKey = buildCooldownKey(
      diagnosis.recommendedRepairAction,
      diagnosis.likelyTargetType,
      diagnosis.likelyTargetId
    );
    const cooldown = evaluateCooldown(state, cooldownKey, now, config);
    if (cooldown.active) {
      state.status = "cooldown";
      state.lastUpdatedAt = nowIso;
      updateCountersForSkip(state, true);
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_cooldown_active",
        status: "degraded",
        runtimeId,
        diagnosis,
        attempt: null,
        validation: null,
        reasonCodes: [cooldown.reason ?? "COOLDOWN_ACTIVE"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_skipped",
        status: "degraded",
        runtimeId,
        diagnosis,
        attempt: null,
        validation: null,
        reasonCodes: [cooldown.reason ?? "COOLDOWN_ACTIVE"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "cooldown",
        diagnosis,
        repairAttempt: null,
        validation: null,
        skipped: true,
        cooldownActive: true,
        reasonCodes: [cooldown.reason ?? "COOLDOWN_ACTIVE"],
        state,
      };
    }

    applyCooldownAttempt(state, {
      key: cooldownKey,
      now,
      targetType: diagnosis.likelyTargetType,
      targetId: diagnosis.likelyTargetId,
      action: diagnosis.recommendedRepairAction,
      config,
    });

    state.status = "repair_dispatched";
    state.lastUpdatedAt = nowIso;
    await stateRepository.write(state);

    emitRuntimeRepairLedgerEvent(this.ledger, {
      eventType: "runtime_repair_attempted",
      status: "started",
      runtimeId,
      diagnosis,
      attempt: null,
      validation: null,
      reasonCodes: ["REPAIR_DISPATCHED"],
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    state.status = "repair_in_progress";

    let agentResult: RuntimeRepairAgentResult;
    try {
      agentResult = await this.executeAgent(diagnosis.recommendedRepairAction, {
        runtimeId,
        now,
        diagnosis,
        config,
      });
    } catch (error) {
      agentResult = {
        agentId: "repair_agent_exception",
        startedAt: nowIso,
        completedAt: nowIso,
        success: false,
        reasonCodes: ["AGENT_EXECUTION_ERROR"],
        metadata: {
          error: String(error),
        },
      };
    }

    const attempt = toAttempt(
      diagnosis.diagnosisId,
      now,
      diagnosis.recommendedRepairAction,
      diagnosis.anomalyType,
      diagnosis.likelyTargetType,
      diagnosis.likelyTargetId,
      agentResult
    );

    state.latestRepairAttempt = attempt;
    state.summaryCounters.totalRepairsAttempted += 1;

    if (!attempt.success) {
      state.status = "repair_failed";
      state.summaryCounters.totalRepairsFailed += 1;
      state.lastUpdatedAt = nowIso;
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_repair_failed",
        status: "failed",
        runtimeId,
        diagnosis,
        attempt,
        validation: null,
        reasonCodes: attempt.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "repair_failed",
        diagnosis,
        repairAttempt: attempt,
        validation: null,
        skipped: false,
        cooldownActive: false,
        reasonCodes: attempt.reasonCodes,
        state,
      };
    }

    state.status = "repair_succeeded";
    state.summaryCounters.totalRepairsSucceeded += 1;
    state.lastUpdatedAt = nowIso;

    emitRuntimeRepairLedgerEvent(this.ledger, {
      eventType: "runtime_repair_succeeded",
      status: "completed",
      runtimeId,
      diagnosis,
      attempt,
      validation: null,
      reasonCodes: attempt.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    state.status = "validation_in_progress";
    emitRuntimeRepairLedgerEvent(this.ledger, {
      eventType: "runtime_recovery_validation_started",
      status: "started",
      runtimeId,
      diagnosis,
      attempt,
      validation: null,
      reasonCodes: ["VALIDATION_STARTED"],
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    const validation = await this.validator.validate({
      now,
      diagnosis,
      attempt,
      config,
      runtimeId,
      heartbeatState,
    });

    state.latestValidation = validation;
    state.lastUpdatedAt = nowIso;

    if (validation.success) {
      state.status = "validation_succeeded";
      state.summaryCounters.totalValidationsSucceeded += 1;
      await stateRepository.write(state);
      emitRuntimeRepairLedgerEvent(this.ledger, {
        eventType: "runtime_recovery_validation_succeeded",
        status: "completed",
        runtimeId,
        diagnosis,
        attempt,
        validation,
        reasonCodes: validation.reasonCodes,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
      return {
        status: "validation_succeeded",
        diagnosis,
        repairAttempt: attempt,
        validation,
        skipped: false,
        cooldownActive: false,
        reasonCodes: validation.reasonCodes,
        state,
      };
    }

    state.status = "validation_failed";
    state.summaryCounters.totalValidationsFailed += 1;
    await stateRepository.write(state);
    emitRuntimeRepairLedgerEvent(this.ledger, {
      eventType: "runtime_recovery_validation_failed",
      status: "failed",
      runtimeId,
      diagnosis,
      attempt,
      validation,
      reasonCodes: validation.reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    return {
      status: "validation_failed",
      diagnosis,
      repairAttempt: attempt,
      validation,
      skipped: false,
      cooldownActive: false,
      reasonCodes: validation.reasonCodes,
      state,
    };
  }

  private async executeAgent(
    action: RuntimeRepairAttempt["repairAction"],
    context: Parameters<RestartRepairAgent["execute"]>[0]
  ): Promise<RuntimeRepairAgentResult> {
    if (action === "restart_runtime_worker") {
      return this.restartAgent.execute(context);
    }
    if (action === "recover_queue") {
      return this.queueRecoveryAgent.execute(context);
    }
    if (action === "cleanup_memory") {
      return this.memoryCleanupAgent.execute(context);
    }
    if (action === "reset_capability_state") {
      return this.capabilityResetAgent.execute(context);
    }
    return {
      agentId: "no_action_agent",
      startedAt: context.now.toISOString(),
      completedAt: context.now.toISOString(),
      success: false,
      reasonCodes: ["NO_ACTION_AGENT"],
      metadata: {},
    };
  }
}

export async function runRuntimeRepairCycle(
  input: RuntimeRepairOrchestratorInput = {},
  ledger: ExecutionLedger = getExecutionLedger()
): Promise<RuntimeRepairCycleResult> {
  const orchestrator = new RuntimeRepairOrchestrator(ledger);
  return orchestrator.run(input);
}

export function createRuntimeRepairStateForTests(runtimeId: string, at = new Date().toISOString()): RuntimeRepairStateSurface {
  return createInitialRuntimeRepairState(runtimeId, at);
}
