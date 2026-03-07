import { test } from "node:test";
import * as assert from "node:assert/strict";
import { SignalFactory } from "../signals/signal-factory";
import { CognitiveSignalPriority } from "../signals/signal-priority";
import { SignalRouter } from "../signals/signal-router";
import { CognitiveSignalType } from "../signals/signal-types";
import { WILDCARD_SIGNAL } from "../signals/cognitive-signal";

test("signal router emits to matching subscribers only", async () => {
  const router = new SignalRouter();
  const factory = new SignalFactory({ nodeId: "mesh-test", defaultPriority: CognitiveSignalPriority.NORMAL });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_STARTED, (signal) => {
    received.push(signal.signalType);
  });

  await router.emit(
    factory.create({
      signalType: CognitiveSignalType.TASK_STARTED,
      correlationId: "corr-1",
    })
  );
  await router.emit(
    factory.create({
      signalType: CognitiveSignalType.TASK_COMPLETED,
      correlationId: "corr-1",
    })
  );

  assert.deepEqual(received, [CognitiveSignalType.TASK_STARTED]);
});

test("wildcard subscriber receives all routed signals", async () => {
  const router = new SignalRouter();
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(WILDCARD_SIGNAL, (signal) => {
    received.push(signal.signalType);
  });

  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "corr-2" }));
  await router.emit(factory.create({ signalType: CognitiveSignalType.REPLAN_REQUIRED, correlationId: "corr-2" }));

  assert.deepEqual(received, [CognitiveSignalType.TASK_STARTED, CognitiveSignalType.REPLAN_REQUIRED]);
});

test("signal router isolates failing subscriber and continues delivery", async () => {
  const router = new SignalRouter();
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_STARTED, () => {
    throw new Error("subscriber_failure");
  });
  router.subscribe(CognitiveSignalType.TASK_STARTED, () => {
    received.push("healthy-subscriber");
  });

  const delivered = await router.emit(
    factory.create({
      signalType: CognitiveSignalType.TASK_STARTED,
      correlationId: "corr-isolation",
    })
  );

  assert.equal(delivered, true);
  assert.deepEqual(received, ["healthy-subscriber"]);
});

test("signal router invokes typed and wildcard subscribers together deterministically", async () => {
  const router = new SignalRouter();
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_COMPLETED, () => {
    received.push("typed");
  });
  router.subscribe(WILDCARD_SIGNAL, () => {
    received.push("wildcard");
  });

  await router.emit(
    factory.create({
      signalType: CognitiveSignalType.TASK_COMPLETED,
      correlationId: "corr-typed-wild",
    })
  );

  assert.deepEqual(received, ["typed", "wildcard"]);
});

test("signal router rate limiting drops overflow", async () => {
  let nowMs = 1_000;
  const dropped: string[] = [];
  const router = new SignalRouter({
    rateLimitPerSecond: 2,
    clock: () => nowMs,
    observers: {
      onDropped: (_signal, reason) => dropped.push(reason),
    },
  });
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_STARTED, () => {
    received.push("ok");
  });

  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "c1" }));
  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "c2" }));
  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "c3" }));
  nowMs += 1_001;
  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "c4" }));

  assert.equal(received.length, 3);
  assert.ok(dropped.includes("rate_limited"));
});

test("signal router chain depth protection drops recursive emits", async () => {
  const dropped: string[] = [];
  const router = new SignalRouter({
    maxChainDepth: 1,
    observers: {
      onDropped: (_signal, reason) => dropped.push(reason),
    },
  });
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_STARTED, async () => {
    received.push("task_started");
    await router.emit(factory.create({ signalType: CognitiveSignalType.REPLAN_REQUIRED, correlationId: "recurse" }));
  });
  router.subscribe(CognitiveSignalType.REPLAN_REQUIRED, () => {
    received.push("replan");
  });

  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_STARTED, correlationId: "root" }));

  assert.deepEqual(received, ["task_started"]);
  assert.ok(dropped.includes("max_chain_depth_exceeded"));
});

test("signal router fanout protection blocks unsafe dispatch", async () => {
  const dropped: string[] = [];
  const router = new SignalRouter({
    maxFanout: 1,
    observers: {
      onDropped: (_signal, reason) => dropped.push(reason),
    },
  });
  const factory = new SignalFactory({ nodeId: "mesh-test" });
  const received: string[] = [];

  router.subscribe(CognitiveSignalType.TASK_COMPLETED, () => {
    received.push("sub-1");
  });
  router.subscribe(CognitiveSignalType.TASK_COMPLETED, () => {
    received.push("sub-2");
  });

  await router.emit(factory.create({ signalType: CognitiveSignalType.TASK_COMPLETED, correlationId: "fanout" }));

  assert.deepEqual(received, []);
  assert.ok(dropped.includes("fanout_limit_exceeded"));
});
