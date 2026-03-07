import type { CognitiveSignal, CognitiveSignalContext } from "./signal-types";
import { CognitiveSignalType } from "./signal-types";

export const WILDCARD_SIGNAL = "*";
export type SignalSubscriptionType = CognitiveSignalType | typeof WILDCARD_SIGNAL;

export function isCognitiveSignal(value: unknown): value is CognitiveSignal {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CognitiveSignal>;
  return (
    typeof candidate.signalId === "string" &&
    typeof candidate.sourceNode === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.correlationId === "string" &&
    candidate.signalType !== undefined
  );
}

export function cloneSignalContext(context?: CognitiveSignalContext): CognitiveSignalContext | undefined {
  if (!context) {
    return undefined;
  }
  return {
    ...context,
    tags: context.tags ? [...context.tags] : undefined,
    metadata: context.metadata ? { ...context.metadata } : undefined,
  };
}

