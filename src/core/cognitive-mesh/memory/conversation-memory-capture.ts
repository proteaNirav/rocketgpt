import { MemoryRanking } from "./memory-ranking";
import type {
  ConversationMessage,
  ConversationSession,
  MemoryItem,
  MemoryLayer,
  MemoryTag,
} from "./types/dual-mode-memory.types";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";

let messageSequence = 0;
let memorySequence = 0;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function computeRecency(createdAt: string): number {
  const ageMs = Math.max(0, Date.now() - Date.parse(createdAt));
  const halfLifeMs = 1000 * 60 * 45;
  return clamp01(1 / (1 + ageMs / halfLifeMs));
}

export class ConversationMemoryCapture {
  private readonly ranking = new MemoryRanking();

  constructor(private readonly repository: InMemoryCognitiveMemoryRepository) {}

  upsertSession(session: ConversationSession): void {
    this.repository.upsertSession(session);
  }

  captureMessage(
    input: Omit<ConversationMessage, "messageId" | "createdAt"> & {
      createdAt?: string;
    }
  ): { message: ConversationMessage; memory: MemoryItem } {
    messageSequence += 1;
    const createdAt = input.createdAt ?? new Date().toISOString();
    const message: ConversationMessage = {
      ...input,
      messageId: `msg-${input.sessionId}-${messageSequence}`,
      createdAt,
      tags: input.tags ? [...input.tags] : undefined,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    this.repository.saveMessage(message);

    memorySequence += 1;
    const layer = this.classifyMemoryLayer(message);
    const tags: MemoryTag[] = [
      { key: "role", value: message.role },
      { key: "source", value: message.source },
    ];
    if (message.metadata?.routeType && typeof message.metadata.routeType === "string") {
      tags.push({ key: "route_type", value: message.metadata.routeType });
    }

    const memory: MemoryItem = {
      memoryId: `mem-${message.sessionId}-${memorySequence}`,
      sessionId: message.sessionId,
      layer,
      content: message.content,
      tags,
      links: [],
      provenance: {
        source: "conversation_capture",
        sourceMessageId: message.messageId,
      },
      scores: {
        importance: this.estimateImportance(message),
        novelty: this.estimateNovelty(message),
        confidence: 0.85,
        reuse: this.estimateReuse(message),
        relevance: this.estimateRelevance(message),
        recency: computeRecency(createdAt),
        crossDomainUsefulness: this.estimateCrossDomainUsefulness(message),
      },
      createdAt,
      updatedAt: createdAt,
      metadata: {
        source: message.source,
      },
    };
    this.repository.saveMemory(memory);
    return { message, memory };
  }

  refreshRecency(sessionId: string): void {
    const memories = this.repository.listMemoryBySession(sessionId);
    for (const memory of memories) {
      this.repository.saveMemory({
        ...memory,
        scores: {
          ...memory.scores,
          recency: computeRecency(memory.createdAt),
        },
        updatedAt: new Date().toISOString(),
      });
    }
  }

  private classifyMemoryLayer(message: ConversationMessage): MemoryLayer {
    const text = message.content.toLowerCase();
    if (text.includes("todo") || text.includes("follow up") || text.includes("unresolved")) {
      return "unresolved";
    }
    if (text.includes("decision") || text.includes("choose") || text.includes("selected")) {
      return "decision_linked";
    }
    if (text.includes("bridge") || text.includes("across") || text.includes("domain")) {
      return "cross_domain_bridge";
    }
    if (message.role === "user") {
      return "episodic";
    }
    if (text.length < 80) {
      return "conceptual";
    }
    return "raw_conversation";
  }

  private estimateImportance(message: ConversationMessage): number {
    const text = message.content.toLowerCase();
    const keywordBoost =
      Number(text.includes("urgent")) * 0.2 +
      Number(text.includes("critical")) * 0.2 +
      Number(text.includes("risk")) * 0.15;
    const roleBoost = message.role === "user" ? 0.2 : 0.1;
    return clamp01(0.45 + keywordBoost + roleBoost);
  }

  private estimateNovelty(message: ConversationMessage): number {
    const ranked = this.ranking.rank(this.repository.listMemoryBySession(message.sessionId), {
      query: message.content,
    });
    if (ranked.length === 0) {
      return 0.9;
    }
    const top = ranked[0];
    return clamp01(1 - top.score);
  }

  private estimateReuse(message: ConversationMessage): number {
    const lengthFactor = clamp01(message.content.length / 220);
    const roleFactor = message.role === "system" ? 0.8 : message.role === "assistant" ? 0.6 : 0.7;
    return clamp01(lengthFactor * 0.5 + roleFactor * 0.5);
  }

  private estimateRelevance(message: ConversationMessage): number {
    const hasStructuredHint = message.content.includes(":") || message.content.includes("->");
    return clamp01(0.35 + (hasStructuredHint ? 0.35 : 0.15) + (message.role === "user" ? 0.2 : 0.1));
  }

  private estimateCrossDomainUsefulness(message: ConversationMessage): number {
    const text = message.content.toLowerCase();
    const hits = ["policy", "runtime", "capability", "experience"].filter((term) => text.includes(term)).length;
    return clamp01(hits * 0.2);
  }
}
