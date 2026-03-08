import type {
  ConversationMessage,
  ConversationSession,
  MemoryItem,
  RecallEvent,
  UnresolvedItem,
} from "../types/dual-mode-memory.types";

export interface CognitiveMemoryRepositorySnapshot {
  sessionCount: number;
  messageCount: number;
  memoryItemCount: number;
  recallEventCount: number;
  unresolvedCount: number;
}

export class InMemoryCognitiveMemoryRepository {
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly messagesBySession = new Map<string, ConversationMessage[]>();
  private readonly memoriesBySession = new Map<string, MemoryItem[]>();
  private readonly recallEventsBySession = new Map<string, RecallEvent[]>();
  private readonly unresolvedBySession = new Map<string, UnresolvedItem[]>();
  private readonly memoriesById = new Map<string, MemoryItem>();
  private readonly maxPerSession: number;

  constructor(options: { maxPerSession?: number } = {}) {
    this.maxPerSession = Math.max(50, options.maxPerSession ?? 300);
  }

  upsertSession(session: ConversationSession): void {
    this.sessions.set(session.sessionId, { ...session, metadata: session.metadata ? { ...session.metadata } : undefined });
  }

  getSession(sessionId: string): ConversationSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }
    return { ...session, metadata: session.metadata ? { ...session.metadata } : undefined };
  }

  saveMessage(message: ConversationMessage): void {
    const list = this.messagesBySession.get(message.sessionId) ?? [];
    list.push({
      ...message,
      tags: message.tags ? [...message.tags] : undefined,
      metadata: message.metadata ? { ...message.metadata } : undefined,
    });
    this.messagesBySession.set(message.sessionId, this.trim(list));
  }

  listMessagesBySession(sessionId: string): ConversationMessage[] {
    return (this.messagesBySession.get(sessionId) ?? []).map((item) => ({
      ...item,
      tags: item.tags ? [...item.tags] : undefined,
      metadata: item.metadata ? { ...item.metadata } : undefined,
    }));
  }

  saveMemory(memory: MemoryItem): void {
    this.memoriesById.set(memory.memoryId, this.cloneMemory(memory));
    const list = this.memoriesBySession.get(memory.sessionId) ?? [];
    const idx = list.findIndex((item) => item.memoryId === memory.memoryId);
    if (idx >= 0) {
      list[idx] = this.cloneMemory(memory);
    } else {
      list.push(this.cloneMemory(memory));
    }
    this.memoriesBySession.set(memory.sessionId, this.trim(list));
  }

  findMemoryById(memoryId: string): MemoryItem | undefined {
    const found = this.memoriesById.get(memoryId);
    return found ? this.cloneMemory(found) : undefined;
  }

  listMemoryBySession(sessionId: string): MemoryItem[] {
    return (this.memoriesBySession.get(sessionId) ?? []).map((item) => this.cloneMemory(item));
  }

  listRecentMemory(limit = 20): MemoryItem[] {
    const all = [...this.memoriesById.values()];
    const normalizedLimit = Math.max(1, limit);
    return all
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, normalizedLimit)
      .map((item) => this.cloneMemory(item));
  }

  saveRecallEvent(event: RecallEvent): void {
    const list = this.recallEventsBySession.get(event.sessionId) ?? [];
    list.push({ ...event, selectedMemoryIds: [...event.selectedMemoryIds], metadata: event.metadata ? { ...event.metadata } : undefined });
    this.recallEventsBySession.set(event.sessionId, this.trim(list));
  }

  listRecallEventsBySession(sessionId: string): RecallEvent[] {
    return (this.recallEventsBySession.get(sessionId) ?? []).map((item) => ({
      ...item,
      selectedMemoryIds: [...item.selectedMemoryIds],
      metadata: item.metadata ? { ...item.metadata } : undefined,
    }));
  }

  upsertUnresolved(item: UnresolvedItem): void {
    const list = this.unresolvedBySession.get(item.sessionId) ?? [];
    const idx = list.findIndex((entry) => entry.unresolvedId === item.unresolvedId);
    if (idx >= 0) {
      list[idx] = { ...item };
    } else {
      list.push({ ...item });
    }
    this.unresolvedBySession.set(item.sessionId, this.trim(list));
  }

  listUnresolvedBySession(sessionId: string): UnresolvedItem[] {
    return (this.unresolvedBySession.get(sessionId) ?? []).map((entry) => ({ ...entry }));
  }

  snapshot(): CognitiveMemoryRepositorySnapshot {
    return {
      sessionCount: this.sessions.size,
      messageCount: [...this.messagesBySession.values()].reduce((acc, list) => acc + list.length, 0),
      memoryItemCount: this.memoriesById.size,
      recallEventCount: [...this.recallEventsBySession.values()].reduce((acc, list) => acc + list.length, 0),
      unresolvedCount: [...this.unresolvedBySession.values()].reduce((acc, list) => acc + list.length, 0),
    };
  }

  private trim<T>(items: T[]): T[] {
    if (items.length <= this.maxPerSession) {
      return items;
    }
    return items.slice(items.length - this.maxPerSession);
  }

  private cloneMemory(memory: MemoryItem): MemoryItem {
    return {
      ...memory,
      tags: memory.tags.map((tag) => ({ ...tag })),
      links: memory.links.map((link) => ({ ...link })),
      provenance: { ...memory.provenance },
      scores: { ...memory.scores },
      metadata: memory.metadata ? { ...memory.metadata } : undefined,
    };
  }
}
