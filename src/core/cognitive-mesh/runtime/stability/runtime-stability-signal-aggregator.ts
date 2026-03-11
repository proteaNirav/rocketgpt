import { readFile } from "node:fs/promises";
import type { ExecutionLedgerEntry } from "../execution-ledger";
import type {
  RuntimeStabilityConfig,
  RuntimeStabilitySignal,
} from "./runtime-stability.types";

const STABILITY_RELEVANT_EVENTS = new Set<string>([
  "runtime_repair_attempted",
  "runtime_repair_failed",
  "runtime_repair_succeeded",
  "runtime_recovery_validation_failed",
  "runtime_recovery_validation_succeeded",
  "runtime_learning_analysis_completed",
  "runtime_recurrence_threshold_reached",
  "runtime_repair_ineffectiveness_detected",
  "runtime_containment_triggered",
  "runtime_quarantine_applied",
  "runtime_reintegration_completed",
  "runtime_reintegration_failed",
  "runtime_target_retired_from_auto_reintegration",
  "runtime.heartbeat",
]);

function toText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeTargetType(value: unknown): RuntimeStabilitySignal["targetType"] {
  if (value === "worker" || value === "queue" || value === "capability" || value === "runtime") {
    return value;
  }
  return "runtime";
}

function isHeartbeatIntent(entry: ExecutionLedgerEntry, metadata: Record<string, unknown>): boolean {
  if (entry.eventType === "runtime.heartbeat") {
    return true;
  }
  const action = toText(entry.action, "");
  if (action.startsWith("runtime.heartbeat")) {
    return true;
  }
  return (
    Object.prototype.hasOwnProperty.call(metadata, "heartbeat") ||
    Object.prototype.hasOwnProperty.call(metadata, "heartbeatHybrid") ||
    Object.prototype.hasOwnProperty.call(metadata, "heartbeatManual")
  );
}

function toSignal(entry: ExecutionLedgerEntry): RuntimeStabilitySignal | null {
  const metadata =
    entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};
  const heartbeatIntent = isHeartbeatIntent(entry, metadata);
  if (!STABILITY_RELEVANT_EVENTS.has(entry.eventType) && !heartbeatIntent) {
    return null;
  }

  const targetType = normalizeTargetType(metadata.targetType);
  const targetId = toText(metadata.targetId, entry.target);
  const reasonCodes = Array.isArray(metadata.reasonCodes)
    ? metadata.reasonCodes.filter((item): item is string => typeof item === "string")
    : [];

  return {
    eventId: entry.entryId,
    timestamp: entry.timestamp,
    eventType: heartbeatIntent ? "runtime.heartbeat" : entry.eventType,
    targetType,
    targetId,
    reasonCodes,
    metadata,
  };
}

export class RuntimeStabilitySignalAggregator {
  async collect(config: RuntimeStabilityConfig, now: Date): Promise<RuntimeStabilitySignal[]> {
    try {
      const raw = await readFile(config.ledgerPath, "utf8");
      const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const lookbackStart = now.getTime() - config.lookbackMs;
      const out: RuntimeStabilitySignal[] = [];

      for (let i = lines.length - 1; i >= 0; i -= 1) {
        const line = lines[i]!;
        try {
          const entry = JSON.parse(line) as ExecutionLedgerEntry;
          const ts = Date.parse(entry.timestamp);
          if (!Number.isFinite(ts) || ts < lookbackStart) {
            continue;
          }
          const signal = toSignal(entry);
          if (signal) {
            out.push(signal);
            if (out.length >= config.maxEvidenceEvents) {
              break;
            }
          }
        } catch {
          continue;
        }
      }

      return out.reverse();
    } catch {
      return [];
    }
  }
}
