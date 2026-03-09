import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { hostname as osHostname } from "node:os";
import { detectSideEffectDriftForTimelineJsonlFile, type SideEffectDriftResult } from "./side-effect-drift-detector";
import { verifyCanonicalTimelineJsonlFile, type LedgerIntegrityVerificationResult } from "./ledger-integrity-verifier";
import { readHeartbeatEnvEnabled, readHeartbeatRuntimeKillSwitch } from "./heartbeat-kill-switch";

const DEFAULT_LEDGER_PATH = ".rocketgpt/cognitive-mesh/execution-ledger.jsonl";
const DEFAULT_TIMELINE_PATH = ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
const DEFAULT_KILL_SWITCH_PATH = ".rocketgpt/runtime/kill-switch.json";
const DEFAULT_HEARTBEAT_HEALTHY_THRESHOLD_SECONDS = 90;
const DEFAULT_RECENT_WINDOW_HOURS = 24;

type FileState = "present" | "missing" | "invalid";
type HeartbeatStatus = "never_seen" | "disabled" | "stale" | "healthy" | "unknown";
type RuntimeSummaryStatus = "healthy" | "warning" | "degraded" | "unknown";
type IntegrityStatus = "valid" | "warning" | "not_checked" | "invalid";
type DriftStatus = "none" | "detected" | "not_checked" | "warning";

interface JsonlReadResult {
  path: string;
  exists: boolean;
  lines: string[];
  records: Array<Record<string, unknown>>;
  parseErrorCount: number;
  parseErrorLines: number[];
}

interface RuntimeLedgerSummary {
  path: string;
  exists: boolean;
  lineCount: number;
  entryCount: number;
  parseErrorCount: number;
  status: FileState;
  lastEntryAt: string | null;
  lastAction: string | null;
  heartbeatCount: number;
  failedExecutionCount: number;
}

interface RuntimeTimelineSummary {
  path: string;
  exists: boolean;
  lineCount: number;
  eventCount: number;
  parseErrorCount: number;
  status: FileState;
  lastEventAt: string | null;
  lastAction: string | null;
  lastEventType: string | null;
}

interface RuntimeHeartbeatSummary {
  envEnabled: boolean;
  killSwitchPath: string;
  killSwitchFileState: "loaded" | "missing" | "invalid";
  fileEnabled: boolean;
  lastSeenAt: string | null;
  ageSeconds: number | null;
  status: HeartbeatStatus;
}

interface RuntimeFailureSummary {
  recentWindowHours: number;
  recentFailedExecutionCount: number;
  recentCapabilityVerificationRejectionCount: number;
  recentDeniedOrDegradedCount: number;
}

interface RuntimeStatusSummaryBlock {
  runtimeStatus: RuntimeSummaryStatus;
  heartbeatStatus: HeartbeatStatus;
  ledgerStatus: FileState;
  timelineStatus: FileState;
  integrityStatus: IntegrityStatus;
  driftStatus: DriftStatus;
  notes: string[];
}

export interface RuntimeStatusReport {
  runtimeId: string;
  hostname: string;
  timestamp: string;
  heartbeat: RuntimeHeartbeatSummary;
  ledger: RuntimeLedgerSummary;
  timeline: RuntimeTimelineSummary;
  integrity: {
    status: IntegrityStatus;
    details?: Record<string, unknown>;
  };
  drift: {
    status: DriftStatus;
    details?: Record<string, unknown>;
  };
  failures: RuntimeFailureSummary;
  summary: RuntimeStatusSummaryBlock;
}

export interface RuntimeStatusOptions {
  runtimeId?: string;
  now?: Date;
  env?: NodeJS.ProcessEnv;
  hostname?: string;
  ledgerPath?: string;
  timelinePath?: string;
  killSwitchPath?: string;
  deepVerification?: boolean;
  includeDeepDetails?: boolean;
  maxDetailFindings?: number;
  heartbeatHealthyThresholdSeconds?: number;
  recentWindowHours?: number;
}

function toNonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIsoTimestamp(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) ? epochMs : null;
}

function deriveFileState(exists: boolean, parseErrorCount: number): FileState {
  if (!exists) {
    return "missing";
  }
  if (parseErrorCount > 0) {
    return "invalid";
  }
  return "present";
}

async function readJsonlFile(filePath: string): Promise<JsonlReadResult> {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return {
      path: filePath,
      exists: false,
      lines: [],
      records: [],
      parseErrorCount: 0,
      parseErrorLines: [],
    };
  }

  const text = await readFile(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records: Array<Record<string, unknown>> = [];
  const parseErrorLines: number[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        records.push(parsed as Record<string, unknown>);
      } else {
        parseErrorLines.push(i + 1);
      }
    } catch {
      parseErrorLines.push(i + 1);
    }
  }

  return {
    path: filePath,
    exists: true,
    lines,
    records,
    parseErrorCount: parseErrorLines.length,
    parseErrorLines,
  };
}

function isHeartbeatRecord(record: Record<string, unknown>): boolean {
  const action = toNonEmptyText(record.action);
  const target = toNonEmptyText(record.target);
  if (action?.includes("heartbeat") || target === "system_heartbeat") {
    return true;
  }
  const metadata = record.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return Object.prototype.hasOwnProperty.call(metadata, "heartbeat");
  }
  return false;
}

function getMostRecentRecord(records: Array<Record<string, unknown>>): Record<string, unknown> | null {
  let best: { epochMs: number; record: Record<string, unknown> } | null = null;
  for (const record of records) {
    const epochMs = parseIsoTimestamp(record.timestamp);
    if (epochMs == null) {
      continue;
    }
    if (!best || epochMs > best.epochMs) {
      best = { epochMs, record };
    }
  }
  return best?.record ?? (records.length > 0 ? records[records.length - 1] ?? null : null);
}

function countRecent(records: Array<Record<string, unknown>>, sinceEpochMs: number, predicate: (record: Record<string, unknown>) => boolean): number {
  let count = 0;
  for (const record of records) {
    const ts = parseIsoTimestamp(record.timestamp);
    if (ts == null || ts < sinceEpochMs) {
      continue;
    }
    if (predicate(record)) {
      count += 1;
    }
  }
  return count;
}

function hasRejectedVerificationMarker(value: unknown): boolean {
  if (typeof value === "string") {
    return value.includes("verification_rejected") || value.includes("capability_verification_rejected");
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasRejectedVerificationMarker(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasRejectedVerificationMarker(item));
  }
  return false;
}

function deriveRuntimeId(
  inputRuntimeId: string | undefined,
  env: NodeJS.ProcessEnv,
  hostName: string,
  heartbeatRecord: Record<string, unknown> | null
): string {
  const explicit = toNonEmptyText(inputRuntimeId) ?? toNonEmptyText(env.RGPT_RUNTIME_ID);
  if (explicit) {
    return explicit;
  }

  const metadata = heartbeatRecord?.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const heartbeat = (metadata as Record<string, unknown>).heartbeat;
    if (heartbeat && typeof heartbeat === "object" && !Array.isArray(heartbeat)) {
      const runtimeFromHeartbeat = toNonEmptyText((heartbeat as Record<string, unknown>).runtime_id);
      if (runtimeFromHeartbeat) {
        return runtimeFromHeartbeat;
      }
    }
  }

  return `rgpt-${hostName.toLowerCase()}`;
}

function deriveHeartbeatStatus(params: {
  envEnabled: boolean;
  fileEnabled: boolean;
  lastSeenAt: string | null;
  now: Date;
  healthyThresholdSeconds: number;
}): { status: HeartbeatStatus; ageSeconds: number | null } {
  if (!params.envEnabled || !params.fileEnabled) {
    return { status: "disabled", ageSeconds: null };
  }
  if (!params.lastSeenAt) {
    return { status: "never_seen", ageSeconds: null };
  }

  const lastSeenMs = parseIsoTimestamp(params.lastSeenAt);
  if (lastSeenMs == null) {
    return { status: "unknown", ageSeconds: null };
  }

  const ageSeconds = Math.max(0, Math.floor((params.now.getTime() - lastSeenMs) / 1000));
  if (ageSeconds <= params.healthyThresholdSeconds) {
    return { status: "healthy", ageSeconds };
  }
  return { status: "stale", ageSeconds };
}

function toIntegrityStatus(result: LedgerIntegrityVerificationResult | null, deepVerification: boolean): IntegrityStatus {
  if (!deepVerification) {
    return "not_checked";
  }
  if (!result) {
    return "warning";
  }
  if (result.summary.status === "valid") {
    return "valid";
  }
  if (result.summary.status === "invalid") {
    return "invalid";
  }
  return "warning";
}

function toDriftStatus(result: SideEffectDriftResult | null, deepVerification: boolean): DriftStatus {
  if (!deepVerification) {
    return "not_checked";
  }
  if (!result) {
    return "warning";
  }
  if (result.summary.status === "no_drift") {
    return "none";
  }
  if (result.summary.status === "drift_detected") {
    return "detected";
  }
  return "warning";
}

function summarizeIntegrityResult(
  result: LedgerIntegrityVerificationResult | null,
  includeFull: boolean,
  maxFindings: number
): Record<string, unknown> | undefined {
  if (!result) {
    return undefined;
  }
  if (includeFull) {
    return result as unknown as Record<string, unknown>;
  }
  return {
    summary: result.summary,
    totalFindings: result.findings.length,
    topFindings: result.findings.slice(0, maxFindings),
  };
}

function summarizeDriftResult(
  result: SideEffectDriftResult | null,
  includeFull: boolean,
  maxFindings: number
): Record<string, unknown> | undefined {
  if (!result) {
    return undefined;
  }
  if (includeFull) {
    return result as unknown as Record<string, unknown>;
  }
  return {
    summary: result.summary,
    totalFindings: result.findings.length,
    topFindings: result.findings.slice(0, maxFindings),
  };
}

function buildSummary(input: {
  heartbeatStatus: HeartbeatStatus;
  ledgerStatus: FileState;
  timelineStatus: FileState;
  integrityStatus: IntegrityStatus;
  driftStatus: DriftStatus;
}): RuntimeStatusSummaryBlock {
  const notes: string[] = [];

  if (input.heartbeatStatus === "disabled") {
    notes.push("heartbeat is disabled by env and/or kill-switch policy");
  }
  if (input.heartbeatStatus === "never_seen") {
    notes.push("heartbeat has not been observed yet");
  }
  if (input.heartbeatStatus === "stale") {
    notes.push("heartbeat is stale beyond recency threshold");
  }
  if (input.ledgerStatus === "missing") {
    notes.push("execution ledger file is missing");
  }
  if (input.timelineStatus === "missing") {
    notes.push("runtime timeline file is missing");
  }
  if (input.ledgerStatus === "invalid" || input.timelineStatus === "invalid") {
    notes.push("jsonl parse errors detected in runtime artifacts");
  }
  if (input.integrityStatus === "not_checked" || input.driftStatus === "not_checked") {
    notes.push("deep integrity/drift checks were not run; pass --deep for full verification");
  }

  let runtimeStatus: RuntimeSummaryStatus = "healthy";
  if (
    input.ledgerStatus === "invalid" ||
    input.timelineStatus === "invalid" ||
    input.integrityStatus === "invalid" ||
    input.driftStatus === "detected"
  ) {
    runtimeStatus = "degraded";
  } else if (
    input.heartbeatStatus === "unknown" ||
    input.heartbeatStatus === "stale" ||
    input.heartbeatStatus === "disabled" ||
    input.heartbeatStatus === "never_seen" ||
    input.ledgerStatus === "missing" ||
    input.timelineStatus === "missing" ||
    input.integrityStatus === "warning" ||
    input.integrityStatus === "not_checked" ||
    input.driftStatus === "warning" ||
    input.driftStatus === "not_checked"
  ) {
    runtimeStatus = "warning";
  }

  if (input.ledgerStatus === "missing" && input.timelineStatus === "missing" && input.heartbeatStatus === "never_seen") {
    runtimeStatus = "unknown";
  }

  return {
    runtimeStatus,
    heartbeatStatus: input.heartbeatStatus,
    ledgerStatus: input.ledgerStatus,
    timelineStatus: input.timelineStatus,
    integrityStatus: input.integrityStatus,
    driftStatus: input.driftStatus,
    notes,
  };
}

export async function collectRuntimeStatus(options: RuntimeStatusOptions = {}): Promise<RuntimeStatusReport> {
  const env = options.env ?? process.env;
  const now = options.now ?? new Date();
  const hostName = options.hostname ?? osHostname();
  const ledgerPath = options.ledgerPath ?? env.COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH ?? DEFAULT_LEDGER_PATH;
  const timelinePath = options.timelinePath ?? env.COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH ?? DEFAULT_TIMELINE_PATH;
  const killSwitchPath = options.killSwitchPath ?? env.RGPT_HEARTBEAT_KILL_SWITCH_PATH ?? DEFAULT_KILL_SWITCH_PATH;
  const healthyThresholdSeconds = options.heartbeatHealthyThresholdSeconds ?? DEFAULT_HEARTBEAT_HEALTHY_THRESHOLD_SECONDS;
  const recentWindowHours = options.recentWindowHours ?? DEFAULT_RECENT_WINDOW_HOURS;
  const deepVerification = options.deepVerification === true;
  const includeDeepDetails = options.includeDeepDetails === true;
  const maxDetailFindings =
    typeof options.maxDetailFindings === "number" && Number.isFinite(options.maxDetailFindings)
      ? Math.max(1, Math.floor(options.maxDetailFindings))
      : 10;

  const [ledgerRead, timelineRead, killSwitch] = await Promise.all([
    readJsonlFile(ledgerPath),
    readJsonlFile(timelinePath),
    readHeartbeatRuntimeKillSwitch(killSwitchPath),
  ]);

  const heartbeatCandidates: string[] = [];
  const ledgerHeartbeatRecords = ledgerRead.records.filter((record) => isHeartbeatRecord(record));
  const timelineHeartbeatRecords = timelineRead.records.filter((record) => {
    const action = toNonEmptyText(record.action);
    const stage = toNonEmptyText(record.stage);
    const target = toNonEmptyText(record.target);
    return action?.includes("heartbeat") === true || stage === "runtime_evaluated" && target === "system_heartbeat";
  });

  for (const record of [...ledgerHeartbeatRecords, ...timelineHeartbeatRecords]) {
    const ts = toNonEmptyText(record.timestamp);
    if (ts) {
      heartbeatCandidates.push(ts);
    }
  }

  let lastHeartbeatAt: string | null = null;
  let lastHeartbeatMs = -1;
  for (const candidate of heartbeatCandidates) {
    const ts = parseIsoTimestamp(candidate);
    if (ts != null && ts > lastHeartbeatMs) {
      lastHeartbeatMs = ts;
      lastHeartbeatAt = candidate;
    }
  }

  const heartbeatStatus = deriveHeartbeatStatus({
    envEnabled: readHeartbeatEnvEnabled(env),
    fileEnabled: killSwitch.config.heartbeat,
    lastSeenAt: lastHeartbeatAt,
    now,
    healthyThresholdSeconds,
  });

  const lastLedgerRecord = getMostRecentRecord(ledgerRead.records);
  const lastTimelineRecord = getMostRecentRecord(timelineRead.records);

  const ledgerSummary: RuntimeLedgerSummary = {
    path: ledgerPath,
    exists: ledgerRead.exists,
    lineCount: ledgerRead.lines.length,
    entryCount: ledgerRead.records.length,
    parseErrorCount: ledgerRead.parseErrorCount,
    status: deriveFileState(ledgerRead.exists, ledgerRead.parseErrorCount),
    lastEntryAt: toNonEmptyText(lastLedgerRecord?.timestamp),
    lastAction: toNonEmptyText(lastLedgerRecord?.action),
    heartbeatCount: ledgerHeartbeatRecords.length,
    failedExecutionCount: ledgerRead.records.filter((record) => {
      const eventType = toNonEmptyText(record.eventType);
      const status = toNonEmptyText(record.status);
      return eventType === "execution.failed" || status === "failed";
    }).length,
  };

  const timelineSummary: RuntimeTimelineSummary = {
    path: timelinePath,
    exists: timelineRead.exists,
    lineCount: timelineRead.lines.length,
    eventCount: timelineRead.records.length,
    parseErrorCount: timelineRead.parseErrorCount,
    status: deriveFileState(timelineRead.exists, timelineRead.parseErrorCount),
    lastEventAt: toNonEmptyText(lastTimelineRecord?.timestamp),
    lastAction: toNonEmptyText(lastTimelineRecord?.action),
    lastEventType: toNonEmptyText(lastTimelineRecord?.eventType),
  };

  const nowMs = now.getTime();
  const recentWindowStartMs = nowMs - recentWindowHours * 60 * 60 * 1000;

  const recentFailedExecutionCount = countRecent(
    ledgerRead.records,
    recentWindowStartMs,
    (record) => toNonEmptyText(record.eventType) === "execution.failed" || toNonEmptyText(record.status) === "failed"
  );

  const recentCapabilityVerificationRejectionCount = countRecent(
    ledgerRead.records,
    recentWindowStartMs,
    (record) => hasRejectedVerificationMarker(record)
  );

  const recentDeniedOrDegradedCount = countRecent(
    timelineRead.records,
    recentWindowStartMs,
    (record) => {
      const status = toNonEmptyText(record.status);
      const stage = toNonEmptyText(record.stage);
      return (
        status === "blocked" ||
        status === "partial" ||
        stage === "dispatch_denied" ||
        stage === "execution_denied" ||
        stage === "execution_degraded" ||
        stage === "execution_redirected"
      );
    }
  );

  let integrityResult: LedgerIntegrityVerificationResult | null = null;
  let driftResult: SideEffectDriftResult | null = null;

  if (deepVerification && timelineRead.exists) {
    integrityResult = await verifyCanonicalTimelineJsonlFile(timelinePath);
    driftResult = await detectSideEffectDriftForTimelineJsonlFile(timelinePath, { verifyIntegrity: true });
  }

  const runtimeId = deriveRuntimeId(options.runtimeId, env, hostName, ledgerHeartbeatRecords[ledgerHeartbeatRecords.length - 1] ?? null);

  const heartbeat: RuntimeHeartbeatSummary = {
    envEnabled: readHeartbeatEnvEnabled(env),
    killSwitchPath,
    killSwitchFileState: killSwitch.fileState,
    fileEnabled: killSwitch.config.heartbeat,
    lastSeenAt: lastHeartbeatAt,
    ageSeconds: heartbeatStatus.ageSeconds,
    status: heartbeatStatus.status,
  };

  const integrityStatus = toIntegrityStatus(integrityResult, deepVerification);
  const driftStatus = toDriftStatus(driftResult, deepVerification);

  const summary = buildSummary({
    heartbeatStatus: heartbeat.status,
    ledgerStatus: ledgerSummary.status,
    timelineStatus: timelineSummary.status,
    integrityStatus,
    driftStatus,
  });

  return {
    runtimeId,
    hostname: hostName,
    timestamp: now.toISOString(),
    heartbeat,
    ledger: ledgerSummary,
    timeline: timelineSummary,
    integrity: {
      status: integrityStatus,
      details: summarizeIntegrityResult(integrityResult, includeDeepDetails, maxDetailFindings),
    },
    drift: {
      status: driftStatus,
      details: summarizeDriftResult(driftResult, includeDeepDetails, maxDetailFindings),
    },
    failures: {
      recentWindowHours,
      recentFailedExecutionCount,
      recentCapabilityVerificationRejectionCount,
      recentDeniedOrDegradedCount,
    },
    summary,
  };
}

export function formatRuntimeStatusHuman(report: RuntimeStatusReport): string {
  return [
    `runtime: ${report.runtimeId} @ ${report.hostname}`,
    `timestamp: ${report.timestamp}`,
    `heartbeat: ${report.heartbeat.status} env=${report.heartbeat.envEnabled} file=${report.heartbeat.fileEnabled} last=${report.heartbeat.lastSeenAt ?? "never"}`,
    `ledger: ${report.ledger.status} entries=${report.ledger.entryCount} path=${report.ledger.path}`,
    `timeline: ${report.timeline.status} events=${report.timeline.eventCount} path=${report.timeline.path}`,
    `integrity: ${report.integrity.status}`,
    `drift: ${report.drift.status}`,
    `runtime_status: ${report.summary.runtimeStatus}`,
    report.summary.notes.length > 0 ? `notes: ${report.summary.notes.join(" | ")}` : "notes: none",
  ].join("\n");
}
