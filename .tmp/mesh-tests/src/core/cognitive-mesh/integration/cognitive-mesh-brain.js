"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMeshBrain = void 0;
const cognitive_attention_engine_1 = require("../attention/cognitive-attention-engine");
const cognitive_priority_engine_1 = require("../priority/cognitive-priority-engine");
const priority_queue_1 = require("../priority/priority-queue");
const signal_factory_1 = require("../signals/signal-factory");
const signal_priority_1 = require("../signals/signal-priority");
const signal_router_1 = require("../signals/signal-router");
const signal_types_1 = require("../signals/signal-types");
class CognitiveMeshBrain {
    constructor(options) {
        this.metrics = options?.metrics;
        this.signalRouter =
            options?.signalRouter ??
                new signal_router_1.SignalRouter({
                    observers: {
                        onObserved: () => this.metrics?.increment("mesh_signal_observed"),
                        onDropped: () => this.metrics?.increment("mesh_signal_dropped"),
                    },
                });
        this.signalFactory =
            options?.signalFactory ??
                new signal_factory_1.SignalFactory({
                    nodeId: options?.signalSourceNode ?? "mesh-brain",
                });
        this.attentionEngine = options?.attentionEngine ?? new cognitive_attention_engine_1.CognitiveAttentionEngine();
        this.priorityEngine = options?.priorityEngine ?? new cognitive_priority_engine_1.CognitivePriorityEngine();
        this.priorityQueue = options?.priorityQueue ?? new priority_queue_1.PriorityQueue();
    }
    async ingest(workItem) {
        const createdAtTs = workItem.createdAtTs ?? Date.now();
        const attentionInput = {
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
        this.priorityQueue.enqueue({
            ...workItem,
            createdAtTs,
        }, priority);
        const correlationId = workItem.correlationId ?? workItem.id;
        await this.signalRouter.emit(this.signalFactory.create({
            signalType: signal_types_1.CognitiveSignalType.ATTENTION_REQUESTED,
            priority: attention.band === "critical" ? signal_priority_1.CognitiveSignalPriority.HIGH : signal_priority_1.CognitiveSignalPriority.NORMAL,
            correlationId,
            context: {
                taskId: workItem.id,
                attentionScore: attention.score,
                deadlineTs: workItem.deadlineTs,
                metadata: workItem.metadata,
            },
        }));
        await this.signalRouter.emit(this.signalFactory.create({
            signalType: signal_types_1.CognitiveSignalType.PRIORITY_RECALCULATED,
            priority: priority.queueClass === "p0" ? signal_priority_1.CognitiveSignalPriority.HIGH : signal_priority_1.CognitiveSignalPriority.NORMAL,
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
        }));
        return {
            workItemId: workItem.id,
            attention,
            priority,
            queueClass: priority.queueClass,
        };
    }
    next() {
        return this.priorityQueue.dequeue();
    }
    queueSnapshot() {
        return this.priorityQueue.snapshot();
    }
}
exports.CognitiveMeshBrain = CognitiveMeshBrain;
