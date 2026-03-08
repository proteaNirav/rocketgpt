"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCognitiveMemoryRepository = void 0;
class InMemoryCognitiveMemoryRepository {
    constructor(options = {}) {
        this.sessions = new Map();
        this.messagesBySession = new Map();
        this.memoriesBySession = new Map();
        this.recallEventsBySession = new Map();
        this.unresolvedBySession = new Map();
        this.memoriesById = new Map();
        this.maxPerSession = Math.max(50, options.maxPerSession ?? 300);
    }
    upsertSession(session) {
        this.sessions.set(session.sessionId, { ...session, metadata: session.metadata ? { ...session.metadata } : undefined });
    }
    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return undefined;
        }
        return { ...session, metadata: session.metadata ? { ...session.metadata } : undefined };
    }
    saveMessage(message) {
        const list = this.messagesBySession.get(message.sessionId) ?? [];
        list.push({
            ...message,
            tags: message.tags ? [...message.tags] : undefined,
            metadata: message.metadata ? { ...message.metadata } : undefined,
        });
        this.messagesBySession.set(message.sessionId, this.trim(list));
    }
    listMessagesBySession(sessionId) {
        return (this.messagesBySession.get(sessionId) ?? []).map((item) => ({
            ...item,
            tags: item.tags ? [...item.tags] : undefined,
            metadata: item.metadata ? { ...item.metadata } : undefined,
        }));
    }
    saveMemory(memory) {
        this.memoriesById.set(memory.memoryId, this.cloneMemory(memory));
        const list = this.memoriesBySession.get(memory.sessionId) ?? [];
        const idx = list.findIndex((item) => item.memoryId === memory.memoryId);
        if (idx >= 0) {
            list[idx] = this.cloneMemory(memory);
        }
        else {
            list.push(this.cloneMemory(memory));
        }
        this.memoriesBySession.set(memory.sessionId, this.trim(list));
    }
    findMemoryById(memoryId) {
        const found = this.memoriesById.get(memoryId);
        return found ? this.cloneMemory(found) : undefined;
    }
    listMemoryBySession(sessionId) {
        return (this.memoriesBySession.get(sessionId) ?? []).map((item) => this.cloneMemory(item));
    }
    listRecentMemory(limit = 20) {
        const all = [...this.memoriesById.values()];
        const normalizedLimit = Math.max(1, limit);
        return all
            .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
            .slice(0, normalizedLimit)
            .map((item) => this.cloneMemory(item));
    }
    saveRecallEvent(event) {
        const list = this.recallEventsBySession.get(event.sessionId) ?? [];
        list.push({ ...event, selectedMemoryIds: [...event.selectedMemoryIds], metadata: event.metadata ? { ...event.metadata } : undefined });
        this.recallEventsBySession.set(event.sessionId, this.trim(list));
    }
    listRecallEventsBySession(sessionId) {
        return (this.recallEventsBySession.get(sessionId) ?? []).map((item) => ({
            ...item,
            selectedMemoryIds: [...item.selectedMemoryIds],
            metadata: item.metadata ? { ...item.metadata } : undefined,
        }));
    }
    upsertUnresolved(item) {
        const list = this.unresolvedBySession.get(item.sessionId) ?? [];
        const idx = list.findIndex((entry) => entry.unresolvedId === item.unresolvedId);
        if (idx >= 0) {
            list[idx] = { ...item };
        }
        else {
            list.push({ ...item });
        }
        this.unresolvedBySession.set(item.sessionId, this.trim(list));
    }
    listUnresolvedBySession(sessionId) {
        return (this.unresolvedBySession.get(sessionId) ?? []).map((entry) => ({ ...entry }));
    }
    snapshot() {
        return {
            sessionCount: this.sessions.size,
            messageCount: [...this.messagesBySession.values()].reduce((acc, list) => acc + list.length, 0),
            memoryItemCount: this.memoriesById.size,
            recallEventCount: [...this.recallEventsBySession.values()].reduce((acc, list) => acc + list.length, 0),
            unresolvedCount: [...this.unresolvedBySession.values()].reduce((acc, list) => acc + list.length, 0),
        };
    }
    trim(items) {
        if (items.length <= this.maxPerSession) {
            return items;
        }
        return items.slice(items.length - this.maxPerSession);
    }
    cloneMemory(memory) {
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
exports.InMemoryCognitiveMemoryRepository = InMemoryCognitiveMemoryRepository;
