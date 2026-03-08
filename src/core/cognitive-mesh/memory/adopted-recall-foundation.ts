import { MemoryRanking } from "./memory-ranking";
import type { MemoryItem } from "./types/dual-mode-memory.types";

export type RecallExclusionReasonCode =
  | "MALFORMED_MEMORY_ITEM"
  | "ADOPTION_STATE_EXCLUDED"
  | "QUALITY_SUPPRESSED"
  | "ANOMALY_RISK_EXCLUDED";

export interface RecallCandidateExclusion {
  memoryId: string;
  reasonCode: RecallExclusionReasonCode;
  details?: string;
}

export interface RecallRankingFactors {
  baseScore: number;
  qualityAdjustment: number;
  warningAdjustment: number;
  signalAdjustment: number;
  reinforcementAdjustment: number;
  capabilityAdjustment: number;
  routeAdjustment: number;
}

export interface RecallRankedItem {
  memory: MemoryItem;
  score: number;
  quality: "trusted" | "warning" | "degraded" | "unknown";
  adoptionDecision?: string;
  reasonCodes: string[];
  ranking: RecallRankingFactors;
}

export interface RecallDiagnosticsSummary {
  excludedCount: number;
  malformedCount: number;
  suppressedCount: number;
  riskExcludedCount: number;
  warningIncludedCount: number;
}

export interface AdoptedRecallResult {
  items: RecallRankedItem[];
  exclusions: RecallCandidateExclusion[];
  diagnostics: RecallDiagnosticsSummary;
}

export interface AdoptedRecallInput {
  sessionId: string;
  items: ReadonlyArray<MemoryItem>;
  query?: string;
  intentHint?: string;
  routeType?: string;
  capabilityId?: string;
  riskScore?: number;
  maxItems?: number;
  allowRiskySignals?: boolean;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function metadataString(memory: MemoryItem, key: string): string | undefined {
  const value = memory.metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function metadataStringArray(memory: MemoryItem, key: string): string[] {
  const value = memory.metadata?.[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function metadataNumber(memory: MemoryItem, key: string): number | undefined {
  const value = memory.metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hasTag(memory: MemoryItem, key: string, value?: string): boolean {
  if (!value) {
    return memory.tags.some((tag) => tag.key === key);
  }
  return memory.tags.some((tag) => tag.key === key && tag.value === value);
}

function isMalformed(memory: MemoryItem): boolean {
  return (
    typeof memory.memoryId !== "string" ||
    memory.memoryId.trim().length === 0 ||
    typeof memory.sessionId !== "string" ||
    memory.sessionId.trim().length === 0 ||
    typeof memory.content !== "string" ||
    memory.content.trim().length === 0
  );
}

function qualityWeight(quality: "trusted" | "warning" | "degraded" | "unknown"): number {
  if (quality === "trusted") return 0.18;
  if (quality === "warning") return 0.04;
  if (quality === "degraded") return -0.08;
  return 0;
}

export class AdoptedRecallFoundation {
  private readonly ranking = new MemoryRanking();

  recall(input: AdoptedRecallInput): AdoptedRecallResult {
    const maxItems = Math.max(1, Math.min(20, input.maxItems ?? 6));
    const allowRiskySignals = input.allowRiskySignals === true;
    const exclusions: RecallCandidateExclusion[] = [];
    const eligible: MemoryItem[] = [];
    let warningIncludedCount = 0;

    for (const memory of input.items) {
      if (isMalformed(memory)) {
        exclusions.push({
          memoryId: memory.memoryId ?? "unknown",
          reasonCode: "MALFORMED_MEMORY_ITEM",
        });
        continue;
      }
      const adoptionDecision = metadataString(memory, "adoptionDecision");
      const quality = metadataString(memory, "quality");
      const signalTypes = metadataStringArray(memory, "signalTypes");
      const hasRiskySignal =
        signalTypes.includes("integrity_warning") ||
        signalTypes.includes("drift_detected") ||
        signalTypes.includes("verification_rejected");
      if (
        adoptionDecision === "suppressed" ||
        adoptionDecision === "rejected" ||
        adoptionDecision === "invalid_memory_candidate"
      ) {
        exclusions.push({
          memoryId: memory.memoryId,
          reasonCode: "ADOPTION_STATE_EXCLUDED",
          details: adoptionDecision,
        });
        continue;
      }
      if (quality === "suppressed") {
        exclusions.push({
          memoryId: memory.memoryId,
          reasonCode: "QUALITY_SUPPRESSED",
        });
        continue;
      }
      if (!allowRiskySignals && hasRiskySignal) {
        exclusions.push({
          memoryId: memory.memoryId,
          reasonCode: "ANOMALY_RISK_EXCLUDED",
        });
        continue;
      }
      if (quality === "warning" || adoptionDecision === "adopted_with_warnings" || adoptionDecision === "downgraded_adoption") {
        warningIncludedCount += 1;
      }
      eligible.push(memory);
    }

    const ranked = this.ranking.rank(eligible, {
      query: input.query,
      intentHint: input.intentHint,
      routeType: input.routeType,
      riskScore: input.riskScore,
    });

    const scored: RecallRankedItem[] = ranked.map((item) => {
      const memory = item.memory;
      const adoptionDecision = metadataString(memory, "adoptionDecision");
      const qualityRaw = metadataString(memory, "quality");
      const quality: "trusted" | "warning" | "degraded" | "unknown" =
        qualityRaw === "trusted" || qualityRaw === "warning" || qualityRaw === "degraded" ? qualityRaw : "unknown";
      const warningCount = metadataStringArray(memory, "warnings").length;
      const signalTypes = metadataStringArray(memory, "signalTypes");
      const reasonCodes = metadataStringArray(memory, "reasonCodes");
      const reinforcementScore = metadataNumber(memory, "reinforcementScore") ?? 1;
      const qualityAdjustment = qualityWeight(quality);
      const warningAdjustment = Math.max(-0.12, -warningCount * 0.02);
      const signalAdjustment =
        (signalTypes.includes("adoption_suppressed") ? -0.1 : 0) +
        (signalTypes.includes("verification_warning") ? -0.04 : 0) +
        (signalTypes.includes("degraded_execution") ? -0.06 : 0);
      const reinforcementAdjustment = clamp01((reinforcementScore - 1) * 0.35 + 0.5) - 0.5;
      const capabilityAdjustment =
        input.capabilityId && (hasTag(memory, "capability_id", input.capabilityId) || memory.content.includes(input.capabilityId))
          ? 0.08
          : 0;
      const routeAdjustment =
        input.routeType && (hasTag(memory, "route_type", input.routeType) || memory.content.includes(input.routeType))
          ? 0.05
          : 0;
      const score = clamp01(
        item.score +
          qualityAdjustment +
          warningAdjustment +
          signalAdjustment +
          reinforcementAdjustment +
          capabilityAdjustment +
          routeAdjustment
      );
      return {
        memory,
        score,
        quality,
        adoptionDecision,
        reasonCodes,
        ranking: {
          baseScore: item.score,
          qualityAdjustment,
          warningAdjustment,
          signalAdjustment,
          reinforcementAdjustment,
          capabilityAdjustment,
          routeAdjustment,
        },
      };
    });

    const sorted = scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.memory.updatedAt !== b.memory.updatedAt) return b.memory.updatedAt.localeCompare(a.memory.updatedAt);
      return a.memory.memoryId.localeCompare(b.memory.memoryId);
    });

    const selected = sorted.slice(0, maxItems);
    return {
      items: selected,
      exclusions: exclusions.sort((a, b) => a.memoryId.localeCompare(b.memoryId) || a.reasonCode.localeCompare(b.reasonCode)),
      diagnostics: {
        excludedCount: exclusions.length,
        malformedCount: exclusions.filter((entry) => entry.reasonCode === "MALFORMED_MEMORY_ITEM").length,
        suppressedCount: exclusions.filter((entry) => entry.reasonCode === "ADOPTION_STATE_EXCLUDED" || entry.reasonCode === "QUALITY_SUPPRESSED").length,
        riskExcludedCount: exclusions.filter((entry) => entry.reasonCode === "ANOMALY_RISK_EXCLUDED").length,
        warningIncludedCount,
      },
    };
  }
}
