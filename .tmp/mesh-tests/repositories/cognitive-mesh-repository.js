"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InProcessCognitiveMeshRepository = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
class InProcessCognitiveMeshRepository {
    constructor(durableJsonlPath) {
        this.durableJsonlPath = durableJsonlPath;
        this.events = new Map();
        this.logs = [];
        this.indexes = [];
        this.memoryItems = [];
        this.reasoningSessions = [];
        this.reasoningSteps = [];
        this.asyncTasks = [];
        this.durablePathReady = false;
    }
    async saveEvent(event) {
        this.events.set(event.eventId, event);
        await this.persist("cog_events", event);
    }
    async saveLog(entry) {
        this.logs.push(entry);
        await this.persist("cog_logs", entry);
    }
    async saveIndex(record) {
        this.indexes.push(record);
        await this.persist("cog_indexes", record);
    }
    async saveMemoryItem(record) {
        this.memoryItems.push(record);
        await this.persist("cog_memory_items", record);
    }
    async saveReasoningSession(record) {
        this.reasoningSessions.push(record);
        await this.persist("cog_reasoning_sessions", record);
    }
    async saveReasoningStep(step, trace) {
        const row = { ...step, reasoningSessionId: trace.traceId };
        this.reasoningSteps.push(row);
        await this.persist("cog_reasoning_steps", row);
    }
    async saveAsyncTask(task) {
        this.asyncTasks.push(task);
        await this.persist("cog_async_tasks", task);
    }
    async saveReasoningPlan(plan) {
        const sessionRecord = {
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
    async findRecentEvents(query) {
        return [...this.events.values()]
            .filter((item) => item.sessionId === query.sessionId)
            .filter((item) => (query.sourceType ? item.sourceType === query.sourceType : true))
            .filter((item) => (query.routeType ? item.routeType === query.routeType : true))
            .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
            .slice(0, query.limit);
    }
    async findRecentMemoryItems(query) {
        const list = this.memoryItems
            .filter((item) => item.sessionId === query.sessionId)
            .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
            .slice(0, query.limit * 2);
        const bounded = [];
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
    snapshot() {
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
    async persist(kind, payload) {
        if (!this.durableJsonlPath) {
            return;
        }
        if (!this.durablePathReady) {
            await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.durableJsonlPath), { recursive: true });
            this.durablePathReady = true;
        }
        const row = `${JSON.stringify({ kind, at: new Date().toISOString(), payload })}\n`;
        await (0, promises_1.appendFile)(this.durableJsonlPath, row, "utf8");
    }
}
exports.InProcessCognitiveMeshRepository = InProcessCognitiveMeshRepository;
