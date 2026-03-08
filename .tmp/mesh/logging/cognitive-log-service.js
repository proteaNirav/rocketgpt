"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveLogService = exports.NoOpLogWriter = void 0;
/**
 * NoOpLogWriter keeps the scaffold side-effect free until persistence wiring.
 */
class NoOpLogWriter {
    async write(_entry) {
        // intentionally no-op
    }
}
exports.NoOpLogWriter = NoOpLogWriter;
/**
 * CognitiveLogService provides a stable seam for audit logging.
 */
class CognitiveLogService {
    constructor(writer = new NoOpLogWriter()) {
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
