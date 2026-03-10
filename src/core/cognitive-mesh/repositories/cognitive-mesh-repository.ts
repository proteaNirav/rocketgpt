import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { CognitiveEvent } from "../types/cognitive-event";
import type { IndexRecord, LogEntry } from "../types/index-record";
import type { MemoryRecord } from "../types/memory-record";
import type { ReasoningPlan, ReasoningStep, ReasoningTrace } from "../types/reasoning-trace";

export interface CogReasoningSessionRecord {
  reasoningSessionId: string;
  sessionId: string;
  eventId: string;
  processingMode: string;
  status: "planned";
  createdAt: string;
}

export interface CogAsyncTaskRecord {
  taskId: string;
  eventId: string;
  sessionId: string;
  kind: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

export interface CognitiveMeshRepository {
  saveEvent(event: CognitiveEvent): Promise<void>;
  saveLog(entry: LogEntry): Promise<void>;
  saveIndex(record: IndexRecord): Promise<void>;
  saveMemoryItem(record: MemoryRecord): Promise<void>;
  saveReasoningSession(record: CogReasoningSessionRecord): Promise<void>;
  saveReasoningStep(step: ReasoningStep, trace: ReasoningTrace): Promise<void>;
  saveAsyncTask(task: CogAsyncTaskRecord): Promise<void>;
  findRecentEvents(query: {
    sessionId: string;
    sourceType?: string;
    routeType?: string;
    limit: number;
  }): Promise<CognitiveEvent[]>;
  findRecentMemoryItems(query: {
    sessionId: string;
    limit: number;
    maxChars: number;
  }): Promise<MemoryRecord[]>;
}

export interface CognitiveMeshRepositorySnapshot {
  events: CognitiveEvent[];
  logs: LogEntry[];
  indexes: IndexRecord[];
  memoryItems: MemoryRecord[];
  reasoningSessions: CogReasoningSessionRecord[];
  reasoningSteps: Array<ReasoningStep & { reasoningSessionId: string }>;
  asyncTasks: CogAsyncTaskRecord[];
}

export class InProcessCognitiveMeshRepository implements CognitiveMeshRepository {
  private readonly events = new Map<string, CognitiveEvent>();
  private readonly logs: LogEntry[] = [];
  private readonly indexes: IndexRecord[] = [];
  private readonly memoryItems: MemoryRecord[] = [];
  private readonly reasoningSessions: CogReasoningSessionRecord[] = [];
  private readonly reasoningSteps: Array<ReasoningStep & { reasoningSessionId: string }> = [];
  private readonly asyncTasks: CogAsyncTaskRecord[] = [];
  private durablePathReady = false;

  constructor(private readonly durableJsonlPath?: string) {}

  async saveEvent(event: CognitiveEvent): Promise<void> {
    this.events.set(event.eventId, event);
    await this.persist("cog_events", event);
  }

  async saveLog(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
    await this.persist("cog_logs", entry);
  }

  async saveIndex(record: IndexRecord): Promise<void> {
    this.indexes.push(record);
    await this.persist("cog_indexes", record);
  }

  async saveMemoryItem(record: MemoryRecord): Promise<void> {
    this.memoryItems.push(record);
    await this.persist("cog_memory_items", record);
  }

  async saveReasoningSession(record: CogReasoningSessionRecord): Promise<void> {
    this.reasoningSessions.push(record);
    await this.persist("cog_reasoning_sessions", record);
  }

  async saveReasoningStep(step: ReasoningStep, trace: ReasoningTrace): Promise<void> {
    const row = { ...step, reasoningSessionId: trace.traceId };
    this.reasoningSteps.push(row);
    await this.persist("cog_reasoning_steps", row);
  }

  async saveAsyncTask(task: CogAsyncTaskRecord): Promise<void> {
    this.asyncTasks.push(task);
    await this.persist("cog_async_tasks", task);
  }

  async saveReasoningPlan(plan: ReasoningPlan): Promise<void> {
    const sessionRecord: CogReasoningSessionRecord = {
      reasoningSessionId: plan.trace.traceId,
      sessionId: plan.sessionId,
      eventId: plan.eventId,
      processingMode: plan.selectedProcessingMode,
      status: "planned",
      createdAt: plan.trace.createdAt,
    };
    await this.saveReasoningSession(sessionRecord);
    await Promise.all(plan.trace.steps.map((step) => this.saveReasoningStep(step, plan.trace)));
  }

  async findRecentEvents(query: {
    sessionId: string;
    sourceType?: string;
    routeType?: string;
    limit: number;
  }): Promise<CognitiveEvent[]> {
    return [...this.events.values()]
      .filter((item) => item.sessionId === query.sessionId)
      .filter((item) => (query.sourceType ? item.sourceType === query.sourceType : true))
      .filter((item) => (query.routeType ? item.routeType === query.routeType : true))
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
      .slice(0, query.limit);
  }

  async findRecentMemoryItems(query: {
    sessionId: string;
    limit: number;
    maxChars: number;
  }): Promise<MemoryRecord[]> {
    const list = this.memoryItems
      .filter((item) => item.sessionId === query.sessionId)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, query.limit * 2);
    const bounded: MemoryRecord[] = [];
    let charCount = 0;
    for (const item of list) {
      charCount += item.content.length;
      if (charCount > query.maxChars) {
        break;
      }
      bounded.push(item);
      if (bounded.length >= query.limit) {
        break;
      }
    }
    return bounded;
  }

  snapshot(): CognitiveMeshRepositorySnapshot {
    return {
      events: [...this.events.values()],
      logs: [...this.logs],
      indexes: [...this.indexes],
      memoryItems: [...this.memoryItems],
      reasoningSessions: [...this.reasoningSessions],
      reasoningSteps: [...this.reasoningSteps],
      asyncTasks: [...this.asyncTasks],
    };
  }

  private async persist(kind: string, payload: unknown): Promise<void> {
    if (!this.durableJsonlPath) {
      return;
    }
    if (!this.durablePathReady) {
      await mkdir(dirname(this.durableJsonlPath), { recursive: true });
      this.durablePathReady = true;
    }
    const row = `${JSON.stringify({ kind, at: new Date().toISOString(), payload })}\n`;
    await appendFile(this.durableJsonlPath, row, "utf8");
  }
}
