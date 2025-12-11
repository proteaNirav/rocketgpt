import { randomUUID } from "crypto";

export function newCorrelationId(): string {
  return randomUUID();
}

export function ensureCorrelationId(headers: Headers): string {
  const existing = headers.get("x-correlation-id");
  return existing ?? randomUUID();
}
