import { hostname } from "node:os";
import { createRuntimeSignal, type CognitiveRuntimeSignal } from "./cognitive-signal-system";
import type { ExecutionLedger } from "./execution-ledger";
import { getExecutionLedger } from "./execution-ledger";
import {
  HeartbeatRateLimitGuard,
  canRunHeartbeat,
  type HeartbeatDecisionReasonCode,
  type HeartbeatGateDecision,
} from "./heartbeat-kill-switch";

export interface HeartbeatSignalPayload {
  signal_type: "system_heartbeat";
  timestamp: string;
  runtime_id: string;
  runtime_status: "active" | "blocked";
  guard_status: "allowed" | "blocked";
  ledger_status: "attempted" | "skipped";
  reason_codes: HeartbeatDecisionReasonCode[];
  metadata?: Record<string, unknown>;
}

export interface ManualHeartbeatRunInput {
  runtimeId?: string;
  requestId?: string;
  sessionId?: string;
  killSwitchPath?: string;
  env?: NodeJS.ProcessEnv;
  now?: Date;
  rateLimitGuard?: HeartbeatRateLimitGuard;
  ledger?: ExecutionLedger;
}

export interface ManualHeartbeatRunResult {
  attemptedAt: string;
  runtimeId: string;
  decision: HeartbeatGateDecision;
  emitted: boolean;
  heartbeatSignal?: HeartbeatSignalPayload;
  runtimeSignal?: CognitiveRuntimeSignal;
  ledgerEntryId?: string;
}

function resolveRuntimeId(input?: string): string {
  if (typeof input === "string" && input.trim().length > 0) {
    return input.trim();
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

export async function runSingleManualHeartbeat(input: ManualHeartbeatRunInput = {}): Promise<ManualHeartbeatRunResult> {
  const now = input.now ?? new Date();
  const attemptedAt = now.toISOString();
  const runtimeId = resolveRuntimeId(input.runtimeId);
  const decision = await canRunHeartbeat({
    runtimeId,
    now,
    env: input.env,
    killSwitchPath: input.killSwitchPath,
    rateLimitGuard: input.rateLimitGuard,
  });

  if (!decision.allowed) {
    return {
      attemptedAt,
      runtimeId,
      decision,
      emitted: false,
    };
  }

  const heartbeatSignal: HeartbeatSignalPayload = {
    signal_type: "system_heartbeat",
    timestamp: attemptedAt,
    runtime_id: runtimeId,
    runtime_status: "active",
    guard_status: "allowed",
    ledger_status: "attempted",
    reason_codes: decision.reasonCodes,
    metadata: {
      killSwitchPath: decision.killSwitchPath,
      fileState: decision.metadata.fileState,
    },
  };

  const runtimeSignal = createRuntimeSignal({
    signalType: "system_heartbeat",
    category: "execution",
    source: "manual_heartbeat_runner",
    severity: "info",
    timestamp: attemptedAt,
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: `heartbeat_${runtimeId}`,
    },
    reasonCodes: decision.reasonCodes,
    metadata: {
      heartbeat: heartbeatSignal,
      manual: true,
    },
  });

  const ledger = input.ledger ?? getExecutionLedger();
  const entry = ledger.append({
    category: "runtime",
    eventType: "runtime.guard.evaluated",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: runtimeSignal.ids.executionId,
    },
    mode: "normal",
    status: "evaluated",
    metadata: {
      heartbeat: heartbeatSignal,
      signalId: runtimeSignal.signalId,
      stableIdentity: runtimeSignal.stableIdentity,
      manual: true,
    },
  });

  return {
    attemptedAt,
    runtimeId,
    decision,
    emitted: true,
    heartbeatSignal,
    runtimeSignal,
    ledgerEntryId: entry.entryId,
  };
}

