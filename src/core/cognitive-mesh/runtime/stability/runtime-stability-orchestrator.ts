import { createHash } from "node:crypto";
import { hostname } from "node:os";
import { getExecutionLedger, type ExecutionLedger } from "../execution-ledger";
import { RuntimeDegradationPolicyEngine } from "./runtime-degradation-policy-engine";
import { RuntimeOscillationDetector } from "./runtime-oscillation-detector";
import { RuntimeStabilityScoringEngine } from "./runtime-stability-scoring-engine";
import { RuntimeStabilitySignalAggregator } from "./runtime-stability-signal-aggregator";
import { emitRuntimeStabilityLedgerEvent } from "./runtime-stability-event-emitter";
import {
  RuntimeStabilityStateRepository,
  createInitialRuntimeStabilityState,
} from "./runtime-stability-state-repository";
import type {
  RuntimeStabilityConfig,
  RuntimeStabilityCycleResult,
  RuntimeStabilityEvaluation,
  RuntimeStabilityOrchestratorInput,
  RuntimeStabilitySignal,
  RuntimeInstabilityPattern,
  RuntimeStabilityStateSurface,
} from "./runtime-stability.types";

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

function hashId(prefix: string, material: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(material)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
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

function resolveConfig(env: NodeJS.ProcessEnv): RuntimeStabilityConfig {
  return {
    enabled: parseBoolean(env.RGPT_RUNTIME_STABILITY_ENABLED, true),
    lookbackMs: parseNumber(env.RGPT_RUNTIME_STABILITY_LOOKBACK_MS, 60 * 60 * 1000, 1000),
    oscillationThreshold: parseNumber(env.RGPT_RUNTIME_STABILITY_OSCILLATION_THRESHOLD, 2, 1),
    multiTargetThreshold: parseNumber(env.RGPT_RUNTIME_STABILITY_MULTI_TARGET_THRESHOLD, 2, 1),
    evaluationCooldownMs: parseNumber(env.RGPT_RUNTIME_STABILITY_EVALUATION_COOLDOWN_MS, 60_000, 1000),
    maxEvidenceEvents: parseNumber(env.RGPT_RUNTIME_STABILITY_MAX_EVIDENCE_EVENTS, 200, 20),
    statePath: env.RGPT_RUNTIME_STABILITY_STATE_PATH ?? ".rocketgpt/runtime/stability-state.json",
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl",
  };
}

function appendRecentPatterns(state: RuntimeStabilityStateSurface, patterns: RuntimeInstabilityPattern[]): void {
  const merged = [...state.recentInstabilityPatterns, ...patterns];
  state.recentInstabilityPatterns = merged.slice(Math.max(0, merged.length - 50));
}

function createCooldownKey(runtimeId: string): string {
  return `stability_eval:${runtimeId}`;
}

export class RuntimeStabilityOrchestrator {
  private readonly aggregator = new RuntimeStabilitySignalAggregator();
  private readonly scoringEngine = new RuntimeStabilityScoringEngine();
  private readonly oscillationDetector = new RuntimeOscillationDetector();
  private readonly degradationPolicy = new RuntimeDegradationPolicyEngine();

  constructor(private readonly ledger: ExecutionLedger = getExecutionLedger()) {}

  async run(input: RuntimeStabilityOrchestratorInput = {}): Promise<RuntimeStabilityCycleResult> {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const env = input.env ?? process.env;
    const config = resolveConfig(env);
    const runtimeId = resolveRuntimeId(input.runtimeId, env);

    const repository = new RuntimeStabilityStateRepository(config.statePath);
    const state = await repository.read(runtimeId, nowIso);
    state.runtimeId = runtimeId;
    state.lastUpdatedAt = nowIso;

    if (!config.enabled) {
      await repository.write(state);
      return {
        skipped: true,
        cooldownActive: false,
        reasonCodes: ["RUNTIME_STABILITY_DISABLED"],
        evaluation: null,
        state,
      };
    }

    const cooldownKey = createCooldownKey(runtimeId);
    const cooldownUntil = state.evaluationCooldowns[cooldownKey];
    const cooldownUntilMs = cooldownUntil ? Date.parse(cooldownUntil) : Number.NaN;
    if (Number.isFinite(cooldownUntilMs) && now.getTime() < cooldownUntilMs) {
      state.summaryCounters.totalCooldownSkips += 1;
      await repository.write(state);
      return {
        skipped: true,
        cooldownActive: true,
        reasonCodes: ["STABILITY_EVALUATION_COOLDOWN_ACTIVE"],
        evaluation: state.latestEvaluation,
        state,
      };
    }

    const evidenceSignals = input.evidenceSignals ?? (await this.aggregator.collect(config, now));
    const oscillation = this.oscillationDetector.detect({
      signals: evidenceSignals,
      oscillationThreshold: config.oscillationThreshold,
      lookbackMs: config.lookbackMs,
      now,
    });

    const scoring = this.scoringEngine.score({
      signals: evidenceSignals,
      patterns: oscillation.patterns,
      oscillatingTargets: oscillation.oscillatingTargets,
      multiTargetThreshold: config.multiTargetThreshold,
    });

    const policy = this.degradationPolicy.evaluate({
      systemBand: scoring.systemStabilityBand,
      systemScore: scoring.systemStabilityScore,
      patterns: oscillation.patterns,
      targetEvaluations: scoring.targetEvaluations,
    });

    const evidenceWindow = {
      startAt: new Date(now.getTime() - config.lookbackMs).toISOString(),
      endAt: nowIso,
      lookbackMs: config.lookbackMs,
    };

    const reasonCodes = [...new Set([...oscillation.reasonCodes, ...scoring.reasonCodes, ...policy.reasonCodes])];

    const evaluation: RuntimeStabilityEvaluation = {
      stabilityEvaluationId: hashId("stability", {
        runtimeId,
        nowIso,
        systemStabilityScore: scoring.systemStabilityScore,
        systemStabilityBand: scoring.systemStabilityBand,
        degradationAction: policy.action,
      }),
      evaluatedAt: nowIso,
      evidenceWindow,
      targetEvaluations: scoring.targetEvaluations,
      systemStabilityScore: scoring.systemStabilityScore,
      systemStabilityBand: scoring.systemStabilityBand,
      instabilityPatterns: oscillation.patterns,
      degradationAction: policy.action,
      reasonCodes,
      metadata: {
        evidenceSignalCount: evidenceSignals.length,
        oscillationMetadata: oscillation.metadata,
        policyMetadata: policy.metadata,
        ...(input.metadata ?? {}),
      },
    };

    const previousBand = state.degradationState.band;
    const previousAction = state.degradationState.action;
    const changed = previousBand !== evaluation.systemStabilityBand || previousAction !== evaluation.degradationAction;

    state.latestEvaluation = evaluation;
    state.targetStabilityIndex = Object.fromEntries(
      evaluation.targetEvaluations.map((target) => [`${target.targetType}:${target.targetId}`, target])
    );
    appendRecentPatterns(state, evaluation.instabilityPatterns);
    state.degradationState = {
      band: evaluation.systemStabilityBand,
      action: evaluation.degradationAction,
      updatedAt: nowIso,
      changed,
    };
    state.lastUpdatedAt = nowIso;
    state.evaluationCooldowns[cooldownKey] = new Date(now.getTime() + config.evaluationCooldownMs).toISOString();
    state.summaryCounters.totalEvaluations += 1;
    state.summaryCounters.totalPatternDetections += evaluation.instabilityPatterns.length;
    if (evaluation.instabilityPatterns.some((item) => item === "repair_oscillation" || item === "contain_reintegrate_oscillation" || item === "heartbeat_recovery_flap")) {
      state.summaryCounters.totalOscillationDetections += 1;
    }
    if (changed) {
      state.summaryCounters.totalDegradationStateChanges += 1;
    }
    if (evaluation.systemStabilityBand === "critical") {
      state.summaryCounters.totalCriticalTriggers += 1;
    }

    await repository.write(state);

    emitRuntimeStabilityLedgerEvent(this.ledger, {
      eventType: "runtime_stability_evaluated",
      status: "evaluated",
      runtimeId,
      evaluation,
      reasonCodes,
      requestId: input.requestId,
      sessionId: input.sessionId,
    });

    if (evaluation.instabilityPatterns.length > 0) {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_instability_pattern_detected",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: evaluation.instabilityPatterns,
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (evaluation.instabilityPatterns.some((item) => item.includes("oscillation") || item === "heartbeat_recovery_flap")) {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_oscillation_detected",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: ["OSCILLATION_PATTERN_DETECTED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (changed) {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_degradation_state_changed",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: ["DEGRADATION_STATE_CHANGED", `${previousBand}->${evaluation.systemStabilityBand}`],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (evaluation.degradationAction !== "no_action") {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_degradation_action_recommended",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: [evaluation.degradationAction],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (evaluation.systemStabilityBand === "watch") {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_stability_watch_triggered",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: ["STABILITY_WATCH_TRIGGERED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    if (evaluation.systemStabilityBand === "critical") {
      emitRuntimeStabilityLedgerEvent(this.ledger, {
        eventType: "runtime_stability_critical_triggered",
        status: "degraded",
        runtimeId,
        evaluation,
        reasonCodes: ["STABILITY_CRITICAL_TRIGGERED"],
        requestId: input.requestId,
        sessionId: input.sessionId,
      });
    }

    return {
      skipped: false,
      cooldownActive: false,
      reasonCodes,
      evaluation,
      state,
    };
  }
}

export async function runRuntimeStabilityCycle(
  input: RuntimeStabilityOrchestratorInput = {},
  ledger: ExecutionLedger = getExecutionLedger()
): Promise<RuntimeStabilityCycleResult> {
  const orchestrator = new RuntimeStabilityOrchestrator(ledger);
  return orchestrator.run(input);
}

export function createRuntimeStabilityStateForTests(runtimeId: string, at = new Date().toISOString()) {
  return createInitialRuntimeStabilityState(runtimeId, at);
}

export function createRuntimeStabilitySignalsForTests(signals: RuntimeStabilitySignal[]): RuntimeStabilitySignal[] {
  return [...signals];
}
