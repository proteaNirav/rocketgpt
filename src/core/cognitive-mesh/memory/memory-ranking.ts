import type { MemoryItem } from "./types/dual-mode-memory.types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export interface RankedMemoryItem {
  memory: MemoryItem;
  score: number;
  reasons: string[];
}

export interface MemoryRankingInput {
  query?: string;
  intentHint?: string;
  routeType?: string;
  riskScore?: number;
}

export class MemoryRanking {
  rank(items: MemoryItem[], input: MemoryRankingInput): RankedMemoryItem[] {
    const query = (input.query ?? input.intentHint ?? "").toLowerCase().trim();
    const routeType = (input.routeType ?? "").toLowerCase().trim();
    const risk = clamp01(input.riskScore ?? 0);

    return items
      .map((memory) => {
        const reasons: string[] = [];
        const content = memory.content.toLowerCase();
        const queryHit = query.length > 0 && content.includes(query);
        if (queryHit) {
          reasons.push("query_match");
        }
        const routeMatch =
          routeType.length > 0 &&
          memory.tags.some((tag) => tag.key === "route_type" && tag.value.toLowerCase() === routeType);
        if (routeMatch) {
          reasons.push("route_match");
        }
        const recencyWeight = clamp01(memory.scores.recency);
        const relevanceWeight = clamp01(memory.scores.relevance);
        const confidenceWeight = clamp01(memory.scores.confidence);
        const reuseWeight = clamp01(memory.scores.reuse);
        const importanceWeight = clamp01(memory.scores.importance);
        const noveltyWeight = clamp01(memory.scores.novelty);
        const crossDomainWeight = clamp01(memory.scores.crossDomainUsefulness);
        const riskAdjustment = risk > 0.75 ? clamp01(memory.scores.confidence) : 0.5;

        const score =
          relevanceWeight * 0.24 +
          confidenceWeight * 0.14 +
          reuseWeight * 0.18 +
          importanceWeight * 0.14 +
          noveltyWeight * 0.1 +
          recencyWeight * 0.12 +
          crossDomainWeight * 0.08 +
          (queryHit ? 0.08 : 0) +
          (routeMatch ? 0.05 : 0) +
          riskAdjustment * 0.02;

        return {
          memory,
          score: clamp01(score),
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score || b.memory.updatedAt.localeCompare(a.memory.updatedAt) || a.memory.memoryId.localeCompare(b.memory.memoryId));
  }
}
