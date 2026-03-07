import { InputIngestor } from "../sensory/input-ingestor";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { CognitiveMeshBrain } from "../integration/cognitive-mesh-brain";
import type { CognitiveEvent } from "../types/cognitive-event";

export interface MeshWorkflowTriggerInput {
  sessionId: string;
  requestId?: string;
  routeType: string;
  rawInput: unknown;
  metadata?: Record<string, unknown>;
}

export interface MeshChatInput {
  sessionId: string;
  requestId?: string;
  routeType: string;
  rawInput: unknown;
  metadata?: Record<string, unknown>;
}

export interface MeshLiveRuntimeOptions {
  brain?: CognitiveMeshBrain;
}

export class MeshLiveRuntime {
  private readonly brain?: CognitiveMeshBrain;

  constructor(
    private readonly ingestor = new InputIngestor(),
    private readonly router = new MeshRouter(),
    options?: MeshLiveRuntimeOptions
  ) {
    this.brain = options?.brain;
  }

  async processWorkflowTrigger(input: MeshWorkflowTriggerInput): Promise<MeshRouteResult> {
    const event = this.ingestor.ingest({
      sessionId: input.sessionId,
      requestId: input.requestId,
      source: "workflow:trigger",
      routeType: input.routeType,
      rawInput: input.rawInput,
      metadata: {
        ...input.metadata,
        sourceType: "workflow.trigger",
      },
      processingMode: "sync",
    });
    await this.ingestBrain(event);
    return this.router.route(event);
  }

  async processChatUserRequest(input: MeshChatInput): Promise<MeshRouteResult> {
    const event = this.ingestor.ingest({
      sessionId: input.sessionId,
      requestId: input.requestId,
      source: "chat:user_text",
      routeType: input.routeType,
      rawInput: input.rawInput,
      metadata: {
        ...input.metadata,
        sourceType: "chat.user_text",
      },
      processingMode: "sync",
    });
    await this.ingestBrain(event);
    return this.router.route(event);
  }

  getMetricsSnapshot() {
    return this.router.getMetricsSnapshot();
  }

  getRepositorySnapshot() {
    return this.router.getRepositorySnapshot();
  }

  incrementMetric(name: "mesh_chat_hook_invoked"): void {
    this.router.incrementMetric(name);
  }

  getBrainQueueSnapshot() {
    return this.brain?.queueSnapshot();
  }

  private async ingestBrain(event: CognitiveEvent): Promise<void> {
    if (!this.brain) {
      return;
    }
    try {
      await this.brain.ingest({
        id: event.eventId,
        source: event.source,
        kind: event.sourceType === "workflow.trigger" ? "workflow" : "task",
        urgency: event.processingMode === "sync" ? 0.8 : 0.5,
        uncertainty: event.trustClass === "trusted" ? 0.2 : 0.6,
        risk: event.risk.score,
        novelty: 0.4,
        userImpact: event.sourceType === "chat.user_text" ? 0.8 : 0.6,
        strategicValue: event.sourceType === "workflow.trigger" ? 0.75 : 0.5,
        importance: event.sourceType === "workflow.trigger" ? 0.8 : 0.6,
        estimatedCost: event.processingMode === "sync" ? 120 : 300,
        blockingFactor: event.processingMode === "sync" ? 0.7 : 0.4,
        retryCount: 0,
        correlationId: event.requestId ?? event.eventId,
        createdAtTs: Date.parse(event.occurredAt),
        metadata: {
          routeType: event.routeType,
          sourceType: event.sourceType,
          trustClass: event.trustClass,
        },
      });
    } catch {
      // Brain ingestion is optional and must not affect core request routing.
    }
  }
}

let singleton: MeshLiveRuntime | null = null;

export function getMeshLiveRuntime(): MeshLiveRuntime {
  singleton ??= new MeshLiveRuntime();
  return singleton;
}

export function resetMeshLiveRuntimeForTests(): void {
  singleton = null;
}
