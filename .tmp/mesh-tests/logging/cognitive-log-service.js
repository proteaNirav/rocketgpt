"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveLogService = exports.InMemoryLogWriter = void 0;
/**
 * InMemoryLogWriter provides a default observable sink for live mode.
 */
class InMemoryLogWriter {
    constructor() {
        this.entries = [];
    }
    async write(_entry) {
        this.entries.push(_entry);
    }
}
exports.InMemoryLogWriter = InMemoryLogWriter;
/**
 * CognitiveLogService provides a stable seam for audit logging.
 */
class CognitiveLogService {
    constructor(writer = new InMemoryLogWriter()) {
        this.writer = writer;
    }
    async log(ctx) {
        const entry = {
            id: `log_${ctx.event.eventId}_${Date.now()}`,
            eventId: ctx.event.eventId,
            sessionId: ctx.event.sessionId,
            level: ctx.level ?? "info",
            message: ctx.message,
            details: ctx.details,
            createdAt: new Date().toISOString(),
        };
        await this.writer.write(entry);
    }
}
exports.CognitiveLogService = CognitiveLogService;
