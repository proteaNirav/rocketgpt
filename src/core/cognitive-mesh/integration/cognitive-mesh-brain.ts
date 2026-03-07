import { CognitiveAttentionEngine } from "../attention/cognitive-attention-engine";
import type { AttentionInput, AttentionKind, AttentionResult } from "../attention/attention-types";
import { MeshMetrics } from "../metrics/mesh-metrics";
import { CognitivePriorityEngine } from "../priority/cognitive-priority-engine";
import { PriorityQueue, type PrioritizedQueueEntry } from "../priority/priority-queue";
import type { PriorityDecision, PriorityQueueSnapshot } from "../priority/priority-types";
import { SignalFactory } from "../signals/signal-factory";
import { CognitiveSignalPriority } from "../signals/signal-priority";
import { SignalRouter } from "../signals/signal-router";
import { CognitiveSignalType } from "../signals/signal-types";

export interface CognitiveMeshWorkItem {
  id: string;
  source: string;
  kind: AttentionKind;
  urgency: number;
  uncertainty: number;
  risk: number;
  novelty: number;
  userImpact: number;
  strategicValue: number;
  importance: number;
  estimatedCost: number;
  blockingFactor: number;
  retryCount: number;
  correlationId?: string;
  deadlineTs?: number;
  createdAtTs?: number;
  metadata?: Record<string, unknown>;
}

export interface CognitiveMeshBrainIngestResult {
  workItemId: string;
  attention: AttentionResult;
  priority: PriorityDecision;
  queueClass: PriorityDecision["queueClass"];
}

export interface CognitiveMeshBrainOptions {
  signalRouter?: SignalRouter;
  signalFactory?: SignalFactory;
  attentionEngine?: CognitiveAttentionEngine;
  priorityEngine?: CognitivePriorityEngine;
  priorityQueue?: PriorityQueue<CognitiveMeshWorkItem>;
  signalSourceNode?: string;
  metrics?: MeshMetrics;
}

export class CognitiveMeshBrain {
  readonly signalRouter: SignalRouter;
  readonly attentionEngine: CognitiveAttentionEngine;
  readonly priorityEngine: CognitivePriorityEngine;
  readonly priorityQueue: PriorityQueue<CognitiveMeshWorkItem>;
  private readonly signalFactory: SignalFactory;
  private readonly metrics?: MeshMetrics;

  constructor(options?: CognitiveMeshBrainOptions) {
    this.metrics = options?.metrics;
    this.signalRouter =
      options?.signalRouter ??
      new SignalRouter({
        observers: {
          onObserved: () => this.metrics?.increment("mesh_signal_observed"),
          onDropped: () => this.metrics?.increment("mesh_signal_dropped"),
        },
      });
    this.signalFactory =
      options?.signalFactory ??
      new SignalFactory({
        nodeId: options?.signalSourceNode ?? "mesh-brain",
      });
    this.attentionEngine = options?.attentionEngine ?? new CognitiveAttentionEngine();
    this.priorityEngine = options?.priorityEngine ?? new CognitivePriorityEngine();
    this.priorityQueue = options?.priorityQueue ?? new PriorityQueue<CognitiveMeshWorkItem>();
  }

  async ingest(workItem: CognitiveMeshWorkItem): Promise<CognitiveMeshBrainIngestResult> {
    const createdAtTs = workItem.createdAtTs ?? Date.now();
    const attentionInput: AttentionInput = {
      id: workItem.id,
      source: workItem.source,
      kind: workItem.kind,
      urgency: workItem.urgency,
      uncertainty: workItem.uncertainty,
      risk: workItem.risk,
      novelty: workItem.novelty,
      userImpact: workItem.userImpact,
      strategicValue: workItem.strategicValue,
      deadlineTs: workItem.deadlineTs,
      createdAtTs,
      metadata: workItem.metadata,
    };

    const attention = this.attentionEngine.evaluate(attentionInput);
    this.metrics?.increment("mesh_attention_evaluated");

    const priority = this.priorityEngine.evaluate({
      id: workItem.id,
      source: workItem.source,
      attentionScore: attention.score,
      urgency: workItem.urgency,
      importance: workItem.importance,
      estimatedCost: workItem.estimatedCost,
      blockingFactor: workItem.blockingFactor,
      retryCount: workItem.retryCount,
      createdAtTs,
      deadlineTs: workItem.deadlineTs,
      metadata: workItem.metadata,
    });
    this.metrics?.increment("mesh_priority_recalculated");

    this.priorityQueue.enqueue(
      {
        ...workItem,
        createdAtTs,
      },
      priority
    );

    const correlationId = workItem.correlationId ?? workItem.id;
    await this.signalRouter.emit(
      this.signalFactory.create({
        signalType: CognitiveSignalType.ATTENTION_REQUESTED,
        priority: attention.band === "critical" ? CognitiveSignalPriority.HIGH : CognitiveSignalPriority.NORMAL,
        correlationId,
        context: {
          taskId: workItem.id,
          attentionScore: attention.score,
          deadlineTs: workItem.deadlineTs,
          metadata: workItem.metadata,
        },
      })
    );
    await this.signalRouter.emit(
      this.signalFactory.create({
        signalType: CognitiveSignalType.PRIORITY_RECALCULATED,
        priority: priority.queueClass === "p0" ? CognitiveSignalPriority.HIGH : CognitiveSignalPriority.NORMAL,
        correlationId,
        context: {
          taskId: workItem.id,
          attentionScore: attention.score,
          executionCost: workItem.estimatedCost,
          deadlineTs: workItem.deadlineTs,
          metadata: {
            ...(workItem.metadata ?? {}),
            queueClass: priority.queueClass,
            priorityScore: priority.priorityScore,
          },
        },
      })
    );

    return {
      workItemId: workItem.id,
      attention,
      priority,
      queueClass: priority.queueClass,
    };
  }

  next(): PrioritizedQueueEntry<CognitiveMeshWorkItem> | undefined {
    return this.priorityQueue.dequeue();
  }

  queueSnapshot(): PriorityQueueSnapshot {
    return this.priorityQueue.snapshot();
  }
}

