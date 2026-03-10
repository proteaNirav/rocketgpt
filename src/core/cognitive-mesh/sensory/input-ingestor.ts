import { RiskScorer } from "../principal/risk-scorer";
import { TrustClassifier } from "../principal/trust-classifier";
import { SignalNormalizer } from "./signal-normalizer";
import type {
  CognitiveEvent,
  CognitiveSourceType,
  ProcessingMode,
} from "../types/cognitive-event";

export interface IngestRequest {
  sessionId: string;
  requestId?: string;
  source: string;
  rawInput: unknown;
  routeType?: string;
  metadata?: Record<string, unknown>;
  processingMode?: ProcessingMode;
}

/**
 * InputIngestor maps arbitrary incoming signals onto a standard CognitiveEvent.
 * This is designed to stay fast on the sync path and avoid external calls.
 */
export class InputIngestor {
  constructor(
    private readonly normalizer = new SignalNormalizer(),
    private readonly trustClassifier = new TrustClassifier(),
    private readonly riskScorer = new RiskScorer()
  ) {}

  ingest(request: IngestRequest): CognitiveEvent {
    const sourceType = this.resolveSourceType(request);
    const trustClass = this.trustClassifier.classify(request.source, request.metadata);
    const normalizedInput = this.normalizer.normalize(request.rawInput, sourceType);
    const risk = this.riskScorer.scoreFor(trustClass, normalizedInput);
    const now = new Date().toISOString();

    return {
      eventId: `evt_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      sessionId: request.sessionId,
      requestId: request.requestId,
      occurredAt: now,
      source: request.source,
      sourceType,
      routeType: request.routeType,
      processingMode: request.processingMode ?? "sync",
      trustClass,
      risk,
      rawInput: request.rawInput,
      normalizedInput,
      metadata: request.metadata,
      tags: [],
    };
  }

  private resolveSourceType(request: IngestRequest): CognitiveSourceType {
    const hinted = request.metadata?.sourceType;
    if (
      hinted === "chat.user_text" ||
      hinted === "workflow.trigger" ||
      hinted === "cats.task_execution"
    ) {
      return hinted;
    }

    const source = request.source.toLowerCase();
    if (source.includes("chat") || source.includes("user_text")) {
      return "chat.user_text";
    }
    if (source.includes("workflow") || source.includes("orchestrator")) {
      return "workflow.trigger";
    }
    if (source.includes("cats") || source.includes("task")) {
      return "cats.task_execution";
    }
    return "unknown";
  }
}
