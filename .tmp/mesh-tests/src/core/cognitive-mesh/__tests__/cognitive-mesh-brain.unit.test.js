"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_mesh_brain_1 = require("../integration/cognitive-mesh-brain");
const signal_types_1 = require("../signals/signal-types");
const BASE_TS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
(0, node_test_1.test)("brain ingest computes attention and priority and enqueues item", async () => {
    const brain = new cognitive_mesh_brain_1.CognitiveMeshBrain();
    const result = await brain.ingest({
        id: "work-1",
        source: "chat.user_text",
        kind: "task",
        urgency: 0.9,
        uncertainty: 0.3,
        risk: 0.7,
        novelty: 0.5,
        userImpact: 0.8,
        strategicValue: 0.6,
        importance: 0.8,
        estimatedCost: 80,
        blockingFactor: 0.7,
        retryCount: 0,
        createdAtTs: BASE_TS,
    });
    assert.equal(result.workItemId, "work-1");
    assert.equal(result.attention.score > 0, true);
    assert.equal(result.priority.priorityScore > 0, true);
    assert.equal(brain.queueSnapshot().size, 1);
});
(0, node_test_1.test)("brain next returns highest queue class first", async () => {
    const brain = new cognitive_mesh_brain_1.CognitiveMeshBrain();
    await brain.ingest({
        id: "work-low",
        source: "workflow.trigger",
        kind: "workflow",
        urgency: 0.2,
        uncertainty: 0.2,
        risk: 0.2,
        novelty: 0.2,
        userImpact: 0.2,
        strategicValue: 0.2,
        importance: 0.2,
        estimatedCost: 400,
        blockingFactor: 0.1,
        retryCount: 0,
        createdAtTs: BASE_TS,
    });
    await brain.ingest({
        id: "work-high",
        source: "workflow.trigger",
        kind: "workflow",
        urgency: 1,
        uncertainty: 0.7,
        risk: 0.95,
        novelty: 0.6,
        userImpact: 0.95,
        strategicValue: 0.9,
        importance: 0.95,
        estimatedCost: 20,
        blockingFactor: 0.9,
        retryCount: 0,
        createdAtTs: BASE_TS,
        deadlineTs: BASE_TS + 10 * 60 * 1000,
    });
    const first = brain.next();
    const second = brain.next();
    assert.equal(first?.id, "work-high");
    assert.equal(second?.id, "work-low");
});
(0, node_test_1.test)("brain emits attention and priority signals during ingest", async () => {
    const brain = new cognitive_mesh_brain_1.CognitiveMeshBrain();
    const received = [];
    brain.signalRouter.subscribe(signal_types_1.CognitiveSignalType.ATTENTION_REQUESTED, (signal) => {
        received.push(signal.signalType);
    });
    brain.signalRouter.subscribe(signal_types_1.CognitiveSignalType.PRIORITY_RECALCULATED, (signal) => {
        received.push(signal.signalType);
    });
    await brain.ingest({
        id: "work-signals",
        source: "chat.user_text",
        kind: "signal",
        urgency: 0.6,
        uncertainty: 0.4,
        risk: 0.5,
        novelty: 0.3,
        userImpact: 0.6,
        strategicValue: 0.4,
        importance: 0.5,
        estimatedCost: 100,
        blockingFactor: 0.4,
        retryCount: 0,
        createdAtTs: BASE_TS,
    });
    assert.deepEqual(received, [signal_types_1.CognitiveSignalType.ATTENTION_REQUESTED, signal_types_1.CognitiveSignalType.PRIORITY_RECALCULATED]);
});
