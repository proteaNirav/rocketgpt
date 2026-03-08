import type { CognitiveLogContext, LogEntry, LogWriter } from "../types/index-record";

/**
 * InMemoryLogWriter provides a default observable sink for live mode.
 */
export class InMemoryLogWriter implements LogWriter {
  readonly entries: LogEntry[] = [];

  async write(_entry: LogEntry): Promise<void> {
    this.entries.push(_entry);
  }
}

/**
 * CognitiveLogService provides a stable seam for audit logging.
 */
export class CognitiveLogService {
  constructor(private readonly writer: LogWriter = new InMemoryLogWriter()) {}

  async log(ctx: CognitiveLogContext): Promise<void> {
    const entry: LogEntry = {
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
