"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cognitive_priority_engine_1 = require("../priority/cognitive-priority-engine");
const priority_queue_1 = require("../priority/priority-queue");
const BASE_TS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
function createCandidate(overrides = {}) {
    return {
        id: "priority-item",
        source: "mesh-unit-test",
        attentionScore: 55,
        urgency: 0.5,
        importance: 0.5,
        estimatedCost: 200,
        blockingFactor: 0.4,
        retryCount: 0,
        createdAtTs: BASE_TS,
        ...overrides,
    };
}
(0, node_test_1.test)("high attention plus urgency and low cost ranks high", () => {
    const engine = new cognitive_priority_engine_1.CognitivePriorityEngine({ now: () => BASE_TS });
    const result = engine.evaluate(createCandidate({
        id: "high",
        attentionScore: 95,
        urgency: 0.95,
        importance: 0.85,
        estimatedCost: 20,
        blockingFactor: 0.8,
    }));
    assert.equal(result.priorityScore >= 70, true);
    assert.equal(result.queueClass === "p0" || result.queueClass === "p1", true);
});
(0, node_test_1.test)("retry penalty lowers priority score", () => {
    const engine = new cognitive_priority_engine_1.CognitivePriorityEngine({ now: () => BASE_TS });
    const baseline = engine.evaluate(createCandidate({ id: "baseline", retryCount: 0, attentionScore: 80 }));
    const retried = engine.evaluate(createCandidate({ id: "retried", retryCount: 3, attentionScore: 80 }));
    assert.equal(retried.priorityScore < baseline.priorityScore, true);
});
(0, node_test_1.test)("near deadline escalates queue class", () => {
    const engine = new cognitive_priority_engine_1.CognitivePriorityEngine({ now: () => BASE_TS });
    const regular = engine.evaluate(createCandidate({ id: "regular", deadlineTs: BASE_TS + 12 * 60 * 60 * 1000 }));
    const nearDeadline = engine.evaluate(createCandidate({
        id: "deadline",
        deadlineTs: BASE_TS + 5 * 60 * 1000,
        attentionScore: 35,
        urgency: 0.3,
        importance: 0.35,
        estimatedCost: 350,
    }));
    const classRank = { p0: 0, p1: 1, p2: 2, p3: 3 };
    assert.equal(classRank[nearDeadline.queueClass] <= classRank[regular.queueClass], true);
});
(0, node_test_1.test)("priority queue dequeues p0 before lower queue classes", () => {
    const queue = new priority_queue_1.PriorityQueue();
    const makeDecision = (id, queueClass) => ({
        id,
        priorityScore: 80,
        queueClass,
        reasons: [],
        computedAtTs: BASE_TS,
    });
    queue.enqueue({ id: "low", marker: "p3" }, makeDecision("low", "p3"));
    queue.enqueue({ id: "mid", marker: "p1" }, makeDecision("mid", "p1"));
    queue.enqueue({ id: "high", marker: "p0" }, makeDecision("high", "p0"));
    assert.equal(queue.dequeue()?.id, "high");
    assert.equal(queue.dequeue()?.id, "mid");
    assert.equal(queue.dequeue()?.id, "low");
});
(0, node_test_1.test)("priority queue preserves FIFO order within each bucket", () => {
    const queue = new priority_queue_1.PriorityQueue();
    const decision = (id) => ({
        id,
        priorityScore: 65,
        queueClass: "p1",
        reasons: [],
        computedAtTs: BASE_TS,
    });
    queue.enqueue({ id: "first" }, decision("first"));
    queue.enqueue({ id: "second" }, decision("second"));
    queue.enqueue({ id: "third" }, decision("third"));
    assert.equal(queue.dequeue()?.id, "first");
    assert.equal(queue.dequeue()?.id, "second");
    assert.equal(queue.dequeue()?.id, "third");
});
