"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const signal_factory_1 = require("../signals/signal-factory");
const signal_priority_1 = require("../signals/signal-priority");
const signal_router_1 = require("../signals/signal-router");
const signal_types_1 = require("../signals/signal-types");
const cognitive_signal_1 = require("../signals/cognitive-signal");
(0, node_test_1.test)("signal router emits to matching subscribers only", async () => {
    const router = new signal_router_1.SignalRouter();
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test", defaultPriority: signal_priority_1.CognitiveSignalPriority.NORMAL });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_STARTED, (signal) => {
        received.push(signal.signalType);
    });
    await router.emit(factory.create({
        signalType: signal_types_1.CognitiveSignalType.TASK_STARTED,
        correlationId: "corr-1",
    }));
    await router.emit(factory.create({
        signalType: signal_types_1.CognitiveSignalType.TASK_COMPLETED,
        correlationId: "corr-1",
    }));
    assert.deepEqual(received, [signal_types_1.CognitiveSignalType.TASK_STARTED]);
});
(0, node_test_1.test)("wildcard subscriber receives all routed signals", async () => {
    const router = new signal_router_1.SignalRouter();
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(cognitive_signal_1.WILDCARD_SIGNAL, (signal) => {
        received.push(signal.signalType);
    });
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "corr-2" }));
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.REPLAN_REQUIRED, correlationId: "corr-2" }));
    assert.deepEqual(received, [signal_types_1.CognitiveSignalType.TASK_STARTED, signal_types_1.CognitiveSignalType.REPLAN_REQUIRED]);
});
(0, node_test_1.test)("signal router isolates failing subscriber and continues delivery", async () => {
    const router = new signal_router_1.SignalRouter();
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_STARTED, () => {
        throw new Error("subscriber_failure");
    });
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_STARTED, () => {
        received.push("healthy-subscriber");
    });
    const delivered = await router.emit(factory.create({
        signalType: signal_types_1.CognitiveSignalType.TASK_STARTED,
        correlationId: "corr-isolation",
    }));
    assert.equal(delivered, true);
    assert.deepEqual(received, ["healthy-subscriber"]);
});
(0, node_test_1.test)("signal router invokes typed and wildcard subscribers together deterministically", async () => {
    const router = new signal_router_1.SignalRouter();
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_COMPLETED, () => {
        received.push("typed");
    });
    router.subscribe(cognitive_signal_1.WILDCARD_SIGNAL, () => {
        received.push("wildcard");
    });
    await router.emit(factory.create({
        signalType: signal_types_1.CognitiveSignalType.TASK_COMPLETED,
        correlationId: "corr-typed-wild",
    }));
    assert.deepEqual(received, ["typed", "wildcard"]);
});
(0, node_test_1.test)("signal router rate limiting drops overflow", async () => {
    let nowMs = 1000;
    const dropped = [];
    const router = new signal_router_1.SignalRouter({
        rateLimitPerSecond: 2,
        clock: () => nowMs,
        observers: {
            onDropped: (_signal, reason) => dropped.push(reason),
        },
    });
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_STARTED, () => {
        received.push("ok");
    });
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "c1" }));
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "c2" }));
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "c3" }));
    nowMs += 1001;
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "c4" }));
    assert.equal(received.length, 3);
    assert.ok(dropped.includes("rate_limited"));
});
(0, node_test_1.test)("signal router chain depth protection drops recursive emits", async () => {
    const dropped = [];
    const router = new signal_router_1.SignalRouter({
        maxChainDepth: 1,
        observers: {
            onDropped: (_signal, reason) => dropped.push(reason),
        },
    });
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_STARTED, async () => {
        received.push("task_started");
        await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.REPLAN_REQUIRED, correlationId: "recurse" }));
    });
    router.subscribe(signal_types_1.CognitiveSignalType.REPLAN_REQUIRED, () => {
        received.push("replan");
    });
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_STARTED, correlationId: "root" }));
    assert.deepEqual(received, ["task_started"]);
    assert.ok(dropped.includes("max_chain_depth_exceeded"));
});
(0, node_test_1.test)("signal router fanout protection blocks unsafe dispatch", async () => {
    const dropped = [];
    const router = new signal_router_1.SignalRouter({
        maxFanout: 1,
        observers: {
            onDropped: (_signal, reason) => dropped.push(reason),
        },
    });
    const factory = new signal_factory_1.SignalFactory({ nodeId: "mesh-test" });
    const received = [];
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_COMPLETED, () => {
        received.push("sub-1");
    });
    router.subscribe(signal_types_1.CognitiveSignalType.TASK_COMPLETED, () => {
        received.push("sub-2");
    });
    await router.emit(factory.create({ signalType: signal_types_1.CognitiveSignalType.TASK_COMPLETED, correlationId: "fanout" }));
    assert.deepEqual(received, []);
    assert.ok(dropped.includes("fanout_limit_exceeded"));
});
