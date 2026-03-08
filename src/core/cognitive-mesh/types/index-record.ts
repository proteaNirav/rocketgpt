import type { CognitiveEvent } from "./cognitive-event";

export interface IndexRecord {
  id: string;
  eventId: string;
  sessionId: string;
  indexType: "structural";
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface IndexWriter {
  write(record: IndexRecord): Promise<void>;
}

export interface LogEntry {
  id: string;
  eventId: string;
  sessionId: string;
  level: "info" | "warn" | "error";
  message: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface LogWriter {
  write(entry: LogEntry): Promise<void>;
}

export interface CognitiveLogContext {
  event: CognitiveEvent;
  message: string;
  level?: "info" | "warn" | "error";
  details?: Record<string, unknown>;
}
