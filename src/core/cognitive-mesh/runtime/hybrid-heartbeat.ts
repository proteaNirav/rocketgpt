import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { hostname } from "node:os";
import { ExecutionLedger, type ExecutionLedgerStatus } from "./execution-ledger";
import { RuntimeGuard } from "./runtime-guard";
import { createRuntimeSignal } from "./cognitive-signal-system";
import {
  HeartbeatRateLimitGuard,
  canRunHeartbeat,
  type HeartbeatGateDecision,
  type HeartbeatDecisionReasonCode,
} from "./heartbeat-kill-switch";
import { collectRuntimeStatus } from "./runtime-status";

const DEFAULT_LEDGER_PATH = ".rocketgpt/cognitive-mesh/execution-ledger.jsonl";
const DEFAULT_TIMELINE_PATH = ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
const DEFAULT_KILL_SWITCH_PATH = ".rocketgpt/runtime/kill-switch.json";
const DEFAULT_STATE_PATH = ".rocketgpt/runtime/heartbeat-state.json";
const DEFAULT_STALE_AFTER_SECONDS = 300;

type HeartbeatState = "healthy" | "degraded" | "blocked" | "stale" | "failed" | "unknown";
type HeartbeatSource = "internal" | "manual" | "monitor";

interface HeartbeatSubsystemCheck {
  id:
    | "runtime_guard_available"
    | "execution_ledger_path_resolvable"
    | "timeline_path_resolvable"
    | "kill_switch_state_readable"
    | "cognitive_signal_system_available"
    | "runtime_status_collector_callable";
  ok: boolean;
  critical: boolean;
  note?: string;
}

interface HeartbeatSubsystemSummary {
  total: number;
  okCount: number;
  failedCount: number;
  checks: HeartbeatSubsystemCheck[];
}

interface HeartbeatStateSurface {
  runtimeId: string;
  lastEvaluatedAt: string;
  lastHealthyAt: string | null;
  currentState: HeartbeatState;
  previousState: HeartbeatState | null;
  transitionDetected: boolean;
  heartbeatSource: HeartbeatSource;
  envEnabled: boolean;
  fileEnabled: boolean;
  killSwitchPath: string;
  ledgerPath: string;
  timelinePath: string;
  staleAfterSeconds: number;
  notes: string[];
  reasonCodes: HeartbeatDecisionReasonCode[];
  subsystemHealth: HeartbeatSubsystemSummary;
  anomalyDetected: boolean;
  ledgerEventWritten: boolean;
  shouldAlert: boolean;
  policyBlocked: boolean;
  alertSuppressedByPolicy: boolean;
}

export interface HybridHeartbeatEvaluateInput {
  runtimeId?: string;
  source?: HeartbeatSource;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  killSwitchPath?: string;
  statePath?: string;
  ledgerPath?: string;
  timelinePath?: string;
  staleAfterSeconds?: number;
  rateLimitGuard?: HeartbeatRateLimitGuard;
  ledger?: ExecutionLedger;
  requestId?: string;
  sessionId?: string;
}

export interface HybridHeartbeatMonitorReport {
  runtimeId: string;
  evaluatedAt: string;
  heartbeatState: HeartbeatState;
  previousState: HeartbeatState | null;
  transitionDetected: boolean;
  envEnabled: boolean;
  fileEnabled: boolean;
  ledgerEventWritten: boolean;
  shouldAlert: boolean;
  policyBlocked: boolean;
  alertSuppressedByPolicy: boolean;
  notes: string[];
}

export interface HybridHeartbeatEvaluateResult {
  report: HybridHeartbeatMonitorReport;
  decision: HeartbeatGateDecision;
  state: HeartbeatStateSurface;
}

function parseNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) ? new Date(epochMs) : null;
}

function resolveRuntimeId(inputRuntimeId?: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = parseNonEmptyText(inputRuntimeId);
  if (explicit) {
    return explicit;
  }
  const envRuntimeId = parseNonEmptyText(env.RGPT_RUNTIME_ID);
  if (envRuntimeId) {
    return envRuntimeId;
  }
  return `rgpt-${hostname().toLowerCase()}`;
}

function dedupeNotes(notes: string[]): string[] {
  return [...new Set(notes.filter((note) => parseNonEmptyText(note) !== null))];
}

function mapStateToLedgerStatus(state: HeartbeatState): ExecutionLedgerStatus {
  switch (state) {
    case "healthy":
      return "evaluated";
    case "blocked":
      return "denied";
    case "degraded":
    case "stale":
      return "degraded";
    case "failed":
      return "failed";
    default:
      return "evaluated";
  }
}

function shouldAlert(state: HeartbeatState): boolean {
  return state === "blocked" || state === "degraded" || state === "stale" || state === "failed" || state === "unknown";
}

function isPolicyBlocked(decision: HeartbeatGateDecision): boolean {
  if (decision.allowed) {
    return false;
  }
  return decision.reasonCodes.includes("ENV_DISABLED") || decision.reasonCodes.includes("FILE_DISABLED");
}

function shouldWriteLedgerEvent(input: {
  source: HeartbeatSource;
  transitionDetected: boolean;
  currentState: HeartbeatState;
  previousState: HeartbeatState | null;
}): boolean {
  if (input.source === "manual") {
    return true;
  }
  if (input.transitionDetected) {
    return true;
  }
  const anomaly = input.currentState !== "healthy";
  if (anomaly && input.previousState === null) {
    return true;
  }
  return false;
}

function normalizeStaleAfterSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_STALE_AFTER_SECONDS;
  }
  return Math.max(30, Math.floor(value as number));
}

async function filePathResolvable(path: string): Promise<boolean> {
  const dir = dirname(path);
  if (!parseNonEmptyText(dir)) {
    return false;
  }
  try {
    await access(dir, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readStateFile(path: string): Promise<HeartbeatStateSurface | null> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    const value = parsed as Record<string, unknown>;
    const currentState = parseNonEmptyText(value.currentState) as HeartbeatState | null;
    if (!currentState) {
      return null;
    }
    const previousState = parseNonEmptyText(value.previousState) as HeartbeatState | null;
    return {
      runtimeId: parseNonEmptyText(value.runtimeId) ?? "unknown",
      lastEvaluatedAt: parseNonEmptyText(value.lastEvaluatedAt) ?? new Date(0).toISOString(),
      lastHealthyAt: parseNonEmptyText(value.lastHealthyAt),
      currentState,
      previousState,
      transitionDetected: value.transitionDetected === true,
      heartbeatSource: (parseNonEmptyText(value.heartbeatSource) as HeartbeatSource | null) ?? "monitor",
      envEnabled: value.envEnabled === true,
      fileEnabled: value.fileEnabled === true,
      killSwitchPath: parseNonEmptyText(value.killSwitchPath) ?? DEFAULT_KILL_SWITCH_PATH,
      ledgerPath: parseNonEmptyText(value.ledgerPath) ?? DEFAULT_LEDGER_PATH,
      timelinePath: parseNonEmptyText(value.timelinePath) ?? DEFAULT_TIMELINE_PATH,
      staleAfterSeconds: normalizeStaleAfterSeconds(Number(value.staleAfterSeconds)),
      notes: Array.isArray(value.notes) ? value.notes.map((item) => String(item)) : [],
      reasonCodes: Array.isArray(value.reasonCodes)
        ? value.reasonCodes
            .map((item) => parseNonEmptyText(item))
            .filter((item): item is HeartbeatDecisionReasonCode => item !== null)
        : [],
      subsystemHealth:
        value.subsystemHealth && typeof value.subsystemHealth === "object" && !Array.isArray(value.subsystemHealth)
          ? {
              total: Number((value.subsystemHealth as Record<string, unknown>).total) || 0,
              okCount: Number((value.subsystemHealth as Record<string, unknown>).okCount) || 0,
              failedCount: Number((value.subsystemHealth as Record<string, unknown>).failedCount) || 0,
              checks: [],
            }
          : { total: 0, okCount: 0, failedCount: 0, checks: [] },
      anomalyDetected: value.anomalyDetected === true,
      ledgerEventWritten: value.ledgerEventWritten === true,
      shouldAlert: value.shouldAlert === true,
      policyBlocked: value.policyBlocked === true,
      alertSuppressedByPolicy: value.alertSuppressedByPolicy === true,
    };
  } catch {
    return null;
  }
}

async function writeStateFile(path: string, state: HeartbeatStateSurface): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function summarizeChecks(checks: HeartbeatSubsystemCheck[]): HeartbeatSubsystemSummary {
  const okCount = checks.filter((check) => check.ok).length;
  const failedCount = checks.length - okCount;
  return {
    total: checks.length,
    okCount,
    failedCount,
    checks,
  };
}

function deriveHeartbeatState(input: {
  decision: HeartbeatGateDecision;
  checks: HeartbeatSubsystemCheck[];
  previousState: HeartbeatStateSurface | null;
  now: Date;
  staleAfterSeconds: number;
}): { state: HeartbeatState; notes: string[] } {
  const notes: string[] = [];

  if (!input.decision.allowed) {
    notes.push(`heartbeat blocked by kill-switch policy: ${input.decision.reasonCodes.join(",")}`);
    return { state: "blocked", notes };
  }

  const failedCritical = input.checks.filter((check) => !check.ok && check.critical);
  const failedNonCritical = input.checks.filter((check) => !check.ok && !check.critical);

  if (failedCritical.length > 0) {
    notes.push(...failedCritical.map((check) => `${check.id}:${check.note ?? "failed"}`));
    return { state: "failed", notes };
  }

  if (failedNonCritical.length > 0) {
    notes.push(...failedNonCritical.map((check) => `${check.id}:${check.note ?? "degraded"}`));
    return { state: "degraded", notes };
  }

  const lastEval = parseDate(input.previousState?.lastEvaluatedAt);
  if (lastEval) {
    const ageSeconds = Math.max(0, Math.floor((input.now.getTime() - lastEval.getTime()) / 1000));
    if (ageSeconds > input.staleAfterSeconds) {
      notes.push(`stale heartbeat observation gap: ${ageSeconds}s > ${input.staleAfterSeconds}s`);
      return { state: "stale", notes };
    }
  }

  notes.push("all hybrid heartbeat subsystem checks passed");
  return { state: "healthy", notes };
}

function createExecutionId(runtimeId: string, evaluatedAt: string): string {
  const ts = evaluatedAt.replace(/[-:.TZ]/g, "").slice(0, 17);
  return `hybrid_heartbeat_${runtimeId}_${ts}`;
}

async function runSubsystemChecks(input: {
  now: Date;
  env: NodeJS.ProcessEnv;
  ledgerPath: string;
  timelinePath: string;
  killSwitchPath: string;
}): Promise<HeartbeatSubsystemCheck[]> {
  const checks: HeartbeatSubsystemCheck[] = [];

  try {
    const guard = new RuntimeGuard();
    guard.evaluate({
      actionType: "cognitive_mesh_execution",
      source: "hybrid_heartbeat",
      target: "system_heartbeat",
      requestedOperation: "runtime_heartbeat_self_check",
      ids: { requestId: "hb-self-check" },
    });
    checks.push({ id: "runtime_guard_available", ok: true, critical: true });
  } catch (error) {
    checks.push({ id: "runtime_guard_available", ok: false, critical: true, note: String(error) });
  }

  checks.push({
    id: "execution_ledger_path_resolvable",
    ok: await filePathResolvable(input.ledgerPath),
    critical: false,
    note: input.ledgerPath,
  });

  checks.push({
    id: "timeline_path_resolvable",
    ok: await filePathResolvable(input.timelinePath),
    critical: false,
    note: input.timelinePath,
  });

  try {
    createRuntimeSignal({
      signalType: "system_heartbeat",
      category: "execution",
      source: "hybrid_heartbeat",
      severity: "info",
      timestamp: input.now.toISOString(),
      reasonCodes: ["HYBRID_HEARTBEAT_CHECK"],
      metadata: { probe: true },
    });
    checks.push({ id: "cognitive_signal_system_available", ok: true, critical: true });
  } catch (error) {
    checks.push({ id: "cognitive_signal_system_available", ok: false, critical: true, note: String(error) });
  }

  try {
    await collectRuntimeStatus({
      now: input.now,
      env: input.env,
      ledgerPath: input.ledgerPath,
      timelinePath: input.timelinePath,
      killSwitchPath: input.killSwitchPath,
      deepVerification: false,
      includeDeepDetails: false,
    });
    checks.push({ id: "runtime_status_collector_callable", ok: true, critical: true });
  } catch (error) {
    checks.push({ id: "runtime_status_collector_callable", ok: false, critical: true, note: String(error) });
  }

  return checks;
}

async function appendHeartbeatLedgerEvent(input: {
  ledger: ExecutionLedger;
  runtimeId: string;
  nowIso: string;
  source: HeartbeatSource;
  state: HeartbeatState;
  previousState: HeartbeatState | null;
  transitionDetected: boolean;
  decision: HeartbeatGateDecision;
  notes: string[];
  requestId?: string;
  sessionId?: string;
  checks: HeartbeatSubsystemSummary;
}): Promise<void> {
  input.ledger.append({
    category: "runtime",
    eventType: "runtime.guard.evaluated",
    action: `runtime.heartbeat.hybrid.${input.source}`,
    source: "hybrid_heartbeat",
    target: "system_heartbeat",
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: createExecutionId(input.runtimeId, input.nowIso),
    },
    mode: input.state === "degraded" || input.state === "stale" ? "degraded" : "normal",
    status: mapStateToLedgerStatus(input.state),
    metadata: {
      heartbeatHybrid: {
        runtimeId: input.runtimeId,
        source: input.source,
        state: input.state,
        previousState: input.previousState,
        transitionDetected: input.transitionDetected,
        notes: input.notes,
        envEnabled: input.decision.envEnabled,
        fileEnabled: input.decision.fileEnabled,
        reasonCodes: input.decision.reasonCodes,
        checks: {
          total: input.checks.total,
          okCount: input.checks.okCount,
          failedCount: input.checks.failedCount,
          failed: input.checks.checks.filter((check) => !check.ok).map((check) => ({ id: check.id, note: check.note })),
        },
      },
    },
  });
}

export async function evaluateHybridHeartbeat(input: HybridHeartbeatEvaluateInput = {}): Promise<HybridHeartbeatEvaluateResult> {
  const now = input.now ?? new Date();
  const evaluatedAt = now.toISOString();
  const env = input.env ?? process.env;
  const runtimeId = resolveRuntimeId(input.runtimeId, env);
  const source = input.source ?? "internal";
  const killSwitchPath = input.killSwitchPath ?? env.RGPT_HEARTBEAT_KILL_SWITCH_PATH ?? DEFAULT_KILL_SWITCH_PATH;
  const statePath = input.statePath ?? env.RGPT_HEARTBEAT_STATE_PATH ?? DEFAULT_STATE_PATH;
  const ledgerPath = input.ledgerPath ?? env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? DEFAULT_LEDGER_PATH;
  const timelinePath = input.timelinePath ?? env.COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH ?? DEFAULT_TIMELINE_PATH;
  const staleAfterSeconds = normalizeStaleAfterSeconds(input.staleAfterSeconds);

  const previous = await readStateFile(statePath);
  const decision = await canRunHeartbeat({
    runtimeId,
    now,
    env,
    killSwitchPath,
    rateLimitGuard: input.rateLimitGuard,
  });

  const checks = await runSubsystemChecks({
    now,
    env,
    ledgerPath,
    timelinePath,
    killSwitchPath,
  });

  checks.push({
    id: "kill_switch_state_readable",
    ok: decision.metadata.fileState === "loaded",
    critical: false,
    note: decision.metadata.fileState,
  });

  const resolved = deriveHeartbeatState({
    decision,
    checks,
    previousState: previous,
    now,
    staleAfterSeconds,
  });

  const previousState = previous?.currentState ?? null;
  const currentState = resolved.state;
  const transitionDetected = previousState !== null && previousState !== currentState;
  const anomalyDetected = currentState !== "healthy";
  const notes = dedupeNotes([
    ...resolved.notes,
    ...checks.filter((check) => !check.ok).map((check) => `${check.id}:${check.note ?? "failed"}`),
  ]);

  const ledgerEventWritten = shouldWriteLedgerEvent({
    source,
    transitionDetected,
    currentState,
    previousState,
  });

  const subsystemHealth = summarizeChecks(checks);
  const lastHealthyAt = currentState === "healthy" ? evaluatedAt : previous?.lastHealthyAt ?? null;
  const policyBlocked = currentState === "blocked" && isPolicyBlocked(decision);

  if (ledgerEventWritten) {
    const ledger =
      input.ledger ??
      new ExecutionLedger(
        ledgerPath,
        timelinePath
      );
    await appendHeartbeatLedgerEvent({
      ledger,
      runtimeId,
      nowIso: evaluatedAt,
      source,
      state: currentState,
      previousState,
      transitionDetected,
      decision,
      notes,
      requestId: input.requestId,
      sessionId: input.sessionId,
      checks: subsystemHealth,
    });
  }

  const state: HeartbeatStateSurface = {
    runtimeId,
    lastEvaluatedAt: evaluatedAt,
    lastHealthyAt,
    currentState,
    previousState,
    transitionDetected,
    heartbeatSource: source,
    envEnabled: decision.envEnabled,
    fileEnabled: decision.fileEnabled,
    killSwitchPath,
    ledgerPath,
    timelinePath,
    staleAfterSeconds,
    notes,
    reasonCodes: decision.reasonCodes,
    subsystemHealth,
    anomalyDetected,
    ledgerEventWritten,
    shouldAlert: shouldAlert(currentState),
    policyBlocked,
    alertSuppressedByPolicy: policyBlocked,
  };

  await writeStateFile(statePath, state);

  return {
    report: {
      runtimeId,
      evaluatedAt,
      heartbeatState: currentState,
      previousState,
      transitionDetected,
      envEnabled: decision.envEnabled,
      fileEnabled: decision.fileEnabled,
      ledgerEventWritten,
      shouldAlert: state.shouldAlert,
      policyBlocked: state.policyBlocked,
      alertSuppressedByPolicy: state.alertSuppressedByPolicy,
      notes,
    },
    decision,
    state,
  };
}

export async function runHybridHeartbeatMonitor(input: Omit<HybridHeartbeatEvaluateInput, "source"> = {}): Promise<HybridHeartbeatEvaluateResult> {
  return evaluateHybridHeartbeat({
    ...input,
    source: "monitor",
  });
}

export async function readHeartbeatStateMtime(path: string): Promise<number | null> {
  try {
    const info = await stat(path);
    return info.mtimeMs;
  } catch {
    return null;
  }
}

export function getHybridHeartbeatDefaultPaths(env: NodeJS.ProcessEnv = process.env): {
  statePath: string;
  killSwitchPath: string;
  ledgerPath: string;
  timelinePath: string;
} {
  return {
    statePath: env.RGPT_HEARTBEAT_STATE_PATH ?? DEFAULT_STATE_PATH,
    killSwitchPath: env.RGPT_HEARTBEAT_KILL_SWITCH_PATH ?? DEFAULT_KILL_SWITCH_PATH,
    ledgerPath: env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? DEFAULT_LEDGER_PATH,
    timelinePath: env.COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH ?? DEFAULT_TIMELINE_PATH,
  };
}
