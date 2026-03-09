import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { DispatchGuardDecision } from "./dispatch-guard";
import type { RuntimeGuardDecision } from "./runtime-guard";
import {
  canonicalizeExecutionLedgerEntry,
  resolveCanonicalExecutionId,
  type CanonicalTimelineEvent,
} from "./timeline-canonicalizer";
import {
  verifyCanonicalTimelineJsonlFile,
  verifyLedgerIntegrity,
  type LedgerIntegrityVerificationResult,
} from "./ledger-integrity-verifier";
import {
  detectSideEffectDrift,
  detectSideEffectDriftForTimelineJsonlFile,
  type SideEffectDriftResult,
} from "./side-effect-drift-detector";
import {
  deriveDriftSignals,
  deriveIntegritySignals,
  type CognitiveRuntimeSignal,
} from "./cognitive-signal-system";

export type ExecutionLedgerCategory = "runtime" | "dispatch" | "execution" | "side_effect";

export type ExecutionLedgerEventType =
  | "runtime.guard.evaluated"
  | "runtime_repair_diagnosed"
  | "runtime_repair_attempted"
  | "runtime_repair_succeeded"
  | "runtime_repair_failed"
  | "runtime_recovery_validation_started"
  | "runtime_recovery_validation_succeeded"
  | "runtime_recovery_validation_failed"
  | "runtime_repair_skipped"
  | "runtime_repair_cooldown_active"
  | "runtime_pattern_detected"
  | "runtime_root_cause_identified"
  | "runtime_prevention_recommendation_generated"
  | "runtime_learning_analysis_completed"
  | "runtime_learning_analysis_skipped"
  | "runtime_recurrence_threshold_reached"
  | "runtime_repair_ineffectiveness_detected"
  | "dispatch.guard.evaluated"
  | "execution.started"
  | "execution.completed"
  | "execution.failed"
  | "execution.denied"
  | "execution.redirected"
  | "execution.degraded"
  | "execution.audit_required"
  | "dispatch.started"
  | "dispatch.completed"
  | "dispatch.denied"
  | "side_effect.intent"
  | "side_effect.completed";

export type ExecutionLedgerMode = "normal" | "reroute" | "degraded" | "safe_mode_redirect" | "audit_required" | "unknown";

export type ExecutionLedgerStatus =
  | "evaluated"
  | "started"
  | "completed"
  | "failed"
  | "denied"
  | "redirected"
  | "degraded"
  | "audit_required"
  | "intent";

export interface ExecutionLedgerIds {
  requestId?: string;
  executionId?: string;
  correlationId?: string;
  sessionId?: string;
}

export interface ExecutionLedgerGuardSummary {
  runtime?: Pick<RuntimeGuardDecision, "outcome" | "reasons">;
  dispatch?: Pick<DispatchGuardDecision, "outcome" | "reasons" | "reroute">;
}

export interface ExecutionLedgerSideEffectSummary {
  intent: boolean;
  completed: boolean;
  hints?: string[];
}

export interface ExecutionLedgerEntry {
  entryId: string;
  timestamp: string;
  category: ExecutionLedgerCategory;
  eventType: ExecutionLedgerEventType;
  action: string;
  source: string;
  target: string;
  ids: ExecutionLedgerIds;
  mode: ExecutionLedgerMode;
  status: ExecutionLedgerStatus;
  guard?: ExecutionLedgerGuardSummary;
  sideEffect?: ExecutionLedgerSideEffectSummary;
  metadata?: Record<string, unknown>;
}

export interface ExecutionLedgerAppendInput {
  category: ExecutionLedgerCategory;
  eventType: ExecutionLedgerEventType;
  action: string;
  source: string;
  target: string;
  ids?: ExecutionLedgerIds;
  mode?: ExecutionLedgerMode;
  status: ExecutionLedgerStatus;
  guard?: ExecutionLedgerGuardSummary;
  sideEffect?: ExecutionLedgerSideEffectSummary;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

function defaultLedgerPath(): string {
  return process.env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/execution-ledger.jsonl";
}

function defaultTimelinePath(): string {
  return process.env.COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
}

function toText(value: string | undefined, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function createLedgerEntryId(timestampIso: string): string {
  const ts = timestampIso.replace(/[-:.TZ]/g, "").slice(0, 17);
  const entropy = randomUUID().replace(/-/g, "").slice(0, 12);
  return `exec_${ts}_${entropy}`;
}

export class ExecutionLedger {
  private readonly entries: ExecutionLedgerEntry[] = [];
  private readonly timelineEvents: CanonicalTimelineEvent[] = [];
  private readonly timelineSequenceByExecutionId = new Map<string, number>();
  private readonly timelinePrevHashByExecutionId = new Map<string, string>();
  private durablePathReady = false;
  private durableTimelinePathReady = false;

  constructor(
    private readonly durableJsonlPath = defaultLedgerPath(),
    private readonly durableTimelineJsonlPath = defaultTimelinePath()
  ) {}

  append(input: ExecutionLedgerAppendInput): ExecutionLedgerEntry {
    const timestamp = input.timestamp ?? new Date().toISOString();
    const entry: ExecutionLedgerEntry = {
      entryId: createLedgerEntryId(timestamp),
      timestamp,
      category: input.category,
      eventType: input.eventType,
      action: toText(input.action, "unknown_action"),
      source: toText(input.source, "unknown_source"),
      target: toText(input.target, "unknown_target"),
      ids: {
        requestId: input.ids?.requestId,
        executionId: input.ids?.executionId,
        correlationId: input.ids?.correlationId,
        sessionId: input.ids?.sessionId,
      },
      mode: input.mode ?? "unknown",
      status: input.status,
      guard: input.guard
        ? {
            runtime: input.guard.runtime
              ? { outcome: input.guard.runtime.outcome, reasons: [...input.guard.runtime.reasons] }
              : undefined,
            dispatch: input.guard.dispatch
              ? {
                  outcome: input.guard.dispatch.outcome,
                  reasons: [...input.guard.dispatch.reasons],
                  reroute: input.guard.dispatch.reroute ? { ...input.guard.dispatch.reroute } : undefined,
                }
              : undefined,
          }
        : undefined,
      sideEffect: input.sideEffect
        ? {
            intent: input.sideEffect.intent,
            completed: input.sideEffect.completed,
            hints: input.sideEffect.hints ? [...input.sideEffect.hints] : undefined,
          }
        : undefined,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    this.entries.push(entry);
    void this.persist(entry);
    const canonicalExecutionId = resolveCanonicalExecutionId(entry);
    const sequenceNo = (this.timelineSequenceByExecutionId.get(canonicalExecutionId) ?? 0) + 1;
    this.timelineSequenceByExecutionId.set(canonicalExecutionId, sequenceNo);
    const prevEventHash = this.timelinePrevHashByExecutionId.get(canonicalExecutionId) ?? null;
    const timelineEvent = canonicalizeExecutionLedgerEntry(entry, {
      sequenceNo,
      prevEventHash,
    });
    this.timelinePrevHashByExecutionId.set(canonicalExecutionId, timelineEvent.integrity.eventHash);
    this.timelineEvents.push(timelineEvent);
    void this.persistTimelineEvent(timelineEvent);
    return entry;
  }

  snapshot(): ExecutionLedgerEntry[] {
    return this.entries.map((entry) => ({
      ...entry,
      ids: { ...entry.ids },
      guard: entry.guard
        ? {
            runtime: entry.guard.runtime
              ? { outcome: entry.guard.runtime.outcome, reasons: [...entry.guard.runtime.reasons] }
              : undefined,
            dispatch: entry.guard.dispatch
              ? {
                  outcome: entry.guard.dispatch.outcome,
                  reasons: [...entry.guard.dispatch.reasons],
                  reroute: entry.guard.dispatch.reroute ? { ...entry.guard.dispatch.reroute } : undefined,
                }
              : undefined,
          }
        : undefined,
      sideEffect: entry.sideEffect
        ? {
            intent: entry.sideEffect.intent,
            completed: entry.sideEffect.completed,
            hints: entry.sideEffect.hints ? [...entry.sideEffect.hints] : undefined,
          }
        : undefined,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  timelineSnapshot(): CanonicalTimelineEvent[] {
    return this.timelineEvents.map((event) => ({
      ...event,
      correlation: { ...event.correlation },
      authority: {
        ...event.authority,
        roles: event.authority.roles ? [...event.authority.roles] : undefined,
      },
      guards: event.guards
        ? {
            runtimeOutcome: event.guards.runtimeOutcome,
            runtimeReasonCodes: event.guards.runtimeReasonCodes ? [...event.guards.runtimeReasonCodes] : undefined,
            dispatchOutcome: event.guards.dispatchOutcome,
            dispatchReasonCodes: event.guards.dispatchReasonCodes ? [...event.guards.dispatchReasonCodes] : undefined,
            dispatchRerouteTarget: event.guards.dispatchRerouteTarget,
          }
        : undefined,
      sideEffect: event.sideEffect
        ? {
            intent: event.sideEffect.intent,
            completed: event.sideEffect.completed,
            hints: event.sideEffect.hints ? [...event.sideEffect.hints] : undefined,
          }
        : undefined,
      metadata: event.metadata ? { ...event.metadata } : undefined,
      integrity: { ...event.integrity },
    }));
  }

  verifyIntegrity(): LedgerIntegrityVerificationResult {
    return verifyLedgerIntegrity({
      ledgerEntries: this.snapshot(),
      timelineEvents: this.timelineSnapshot(),
    });
  }

  verifyIntegrityWithSignals(): { integrity: LedgerIntegrityVerificationResult; signals: CognitiveRuntimeSignal[] } {
    const integrity = this.verifyIntegrity();
    const signals = deriveIntegritySignals(integrity, {}, "execution_ledger");
    return { integrity, signals };
  }

  verifyTimelineIntegrity(): LedgerIntegrityVerificationResult {
    return verifyLedgerIntegrity({
      timelineEvents: this.timelineSnapshot(),
    });
  }

  detectSideEffectDrift(): SideEffectDriftResult {
    const timelineEvents = this.timelineSnapshot();
    const integrityResult = verifyLedgerIntegrity({ timelineEvents });
    return detectSideEffectDrift({
      timelineEvents,
      integrityResult,
    });
  }

  detectSideEffectDriftWithSignals(): { drift: SideEffectDriftResult; signals: CognitiveRuntimeSignal[] } {
    const drift = this.detectSideEffectDrift();
    const signals = deriveDriftSignals(drift, {}, "execution_ledger");
    return { drift, signals };
  }

  private async persist(entry: ExecutionLedgerEntry): Promise<void> {
    if (!this.durableJsonlPath) {
      return;
    }
    if (!this.durablePathReady) {
      await mkdir(dirname(this.durableJsonlPath), { recursive: true });
      this.durablePathReady = true;
    }
    await appendFile(this.durableJsonlPath, `${JSON.stringify(entry)}\n`, "utf8");
  }

  private async persistTimelineEvent(event: CanonicalTimelineEvent): Promise<void> {
    if (!this.durableTimelineJsonlPath) {
      return;
    }
    if (!this.durableTimelinePathReady) {
      await mkdir(dirname(this.durableTimelineJsonlPath), { recursive: true });
      this.durableTimelinePathReady = true;
    }
    await appendFile(this.durableTimelineJsonlPath, `${JSON.stringify(event)}\n`, "utf8");
  }
}

let singleton: ExecutionLedger | undefined;

export function getExecutionLedger(): ExecutionLedger {
  singleton ??= new ExecutionLedger();
  return singleton;
}

export function resetExecutionLedgerForTests(): void {
  singleton = undefined;
}

export async function verifyRuntimeTimelineJsonlIntegrity(filePath: string): Promise<LedgerIntegrityVerificationResult> {
  return verifyCanonicalTimelineJsonlFile(filePath);
}

export async function detectRuntimeTimelineSideEffectDrift(filePath: string): Promise<SideEffectDriftResult> {
  return detectSideEffectDriftForTimelineJsonlFile(filePath, { verifyIntegrity: true });
}
