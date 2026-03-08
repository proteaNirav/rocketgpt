import { MemoryRanking } from "./memory-ranking";
import type {
  MemoryAccessContext,
  MemoryPacket,
} from "./types/dual-mode-memory.types";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";
import type { MemoryItem } from "./types/dual-mode-memory.types";
import { AdoptedRecallFoundation } from "./adopted-recall-foundation";

let packetSequence = 0;

export interface MemoryPacketOptions {
  limit?: number;
  relevanceFloor?: number;
  query?: string;
}

export class MemoryPacketService {
  private readonly ranking = new MemoryRanking();
  private readonly adoptedRecall = new AdoptedRecallFoundation();

  constructor(private readonly repository: InMemoryCognitiveMemoryRepository) {}

  buildPacket(context: MemoryAccessContext, options: MemoryPacketOptions = {}): MemoryPacket {
    const allowInjection = context.entitlement?.allowInjection ?? true;
    const limit = Math.max(1, Math.min(5, options.limit ?? 3));
    const relevanceFloor = Math.max(0.4, Math.min(0.95, options.relevanceFloor ?? 0.62));

    let memoryItems = [] as ReturnType<MemoryRanking["rank"]>;
    if (allowInjection) {
      const recall = this.adoptedRecall.recall({
        sessionId: context.sessionId,
        items: this.repository.listMemoryBySession(context.sessionId),
        query: options.query ?? context.purpose,
        capabilityId: context.capabilityId,
        maxItems: Math.max(6, limit * 4),
      });
      memoryItems = this.ranking.rank(
        recall.items.map((item) => item.memory),
        {
          query: options.query ?? context.purpose,
        }
      );
    }

    const selected = allowInjection
      ? memoryItems
          .filter((item) => item.score >= relevanceFloor)
          .slice(0, limit)
          .map((item) => this.toBoundedPacketMemory(item.memory, item.score))
      : [];

    packetSequence += 1;
    return {
      packetId: `packet-${context.sessionId}-${packetSequence}`,
      sessionId: context.sessionId,
      capabilityId: context.capabilityId,
      purpose: context.purpose,
      memoryItems: selected,
      relevanceFloor,
      generatedAt: new Date().toISOString(),
      provenance: {
        recallReason: allowInjection ? "ranked_packet_selection:quality_filtered" : `injection_blocked:${context.entitlement?.reason ?? "entitlement_denied"}`,
        explicit: true,
        query: options.query ?? context.purpose,
      },
    };
  }

  private toBoundedPacketMemory(memory: MemoryItem, score: number): MemoryItem {
    const maxContentLength = 220;
    const content = memory.content.length <= maxContentLength ? memory.content : `${memory.content.slice(0, 217)}...`;
    return {
      ...memory,
      content,
      tags: memory.tags.map((tag) => ({ ...tag })),
      links: memory.links.map((link) => ({ ...link })),
      provenance: { ...memory.provenance },
      scores: {
        ...memory.scores,
        relevance: Math.max(memory.scores.relevance, Math.min(1, score)),
      },
      metadata: {
        ...(memory.metadata ? { ...memory.metadata } : {}),
        packetBounded: true,
        selectionScore: score,
      },
    };
  }
}
