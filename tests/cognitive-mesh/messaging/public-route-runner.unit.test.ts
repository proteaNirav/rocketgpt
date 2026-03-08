import { performance } from "node:perf_hooks";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { CourierService } from "../../../src/core/cognitive-mesh/runtime/messaging/courier-service";
import { DeliveryReceiptLedger } from "../../../src/core/cognitive-mesh/runtime/messaging/delivery-receipt-ledger";
import { MessageEventBus } from "../../../src/core/cognitive-mesh/runtime/messaging/message-event-bus";
import { ParcelPolicyEngine } from "../../../src/core/cognitive-mesh/runtime/messaging/parcel-policy-engine";
import { RouteRegistry } from "../../../src/core/cognitive-mesh/runtime/messaging/route-registry";
import { PublicRouteRunner } from "../../../src/core/cognitive-mesh/runtime/messaging/routes/public-route-runner";
import { StopQueueManager } from "../../../src/core/cognitive-mesh/runtime/messaging/stop-queue-manager";
import { TransportHealthRegistry } from "../../../src/core/cognitive-mesh/runtime/messaging/transport-health-registry";
import type { CognitiveParcel, ParcelSensitivity } from "../../../src/core/cognitive-mesh/runtime/messaging/types/parcel";
import type { RouteDefinition } from "../../../src/core/cognitive-mesh/runtime/messaging/types/route";
import { VehicleSelector } from "../../../src/core/cognitive-mesh/runtime/messaging/vehicle-selector";
import { RuntimeGuard } from "../../../src/core/cognitive-mesh/runtime/runtime-guard";
import { DispatchGuard } from "../../../src/core/cognitive-mesh/runtime/dispatch-guard";

function createRoute(overrides: Partial<RouteDefinition> = {}): RouteDefinition {
  return {
    routeId: "route-test-public",
    tunnel: "interactive",
    vehicleType: "public-bus",
    serviceName: "test-public-route",
    stops: ["cat-hub", "librarian-hub"],
    loopIntervalMs: 1,
    maxParcelPickupPerStop: 5,
    maxParcelsInVehicle: 5,
    allowedSensitivity: ["public", "internal", "confidential"],
    active: true,
    ...overrides,
  };
}

function buildParcel(
  parcelId: string,
  overrides: Partial<CognitiveParcel> = {},
  sensitivity: ParcelSensitivity = "internal"
): CognitiveParcel {
  const now = new Date().toISOString();
  return {
    parcelId,
    sessionId: "session-1",
    sourceNodeId: "cat-hub",
    sourceNodeClass: "cat",
    targetNodeId: "librarian-hub",
    targetNodeClass: "librarian",
    intent: "index",
    eventType: "event.test",
    payload: { parcelId },
    profile: {
      sizeClass: "small",
      sensitivity,
      replayable: true,
      requiresChainOfCustody: false,
    },
    priority: "normal",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createCourierDeps(route: RouteDefinition) {
  const queueManager = new StopQueueManager();
  const policyEngine = new ParcelPolicyEngine();
  const vehicleSelector = new VehicleSelector();
  const routeRegistry = new RouteRegistry();
  const receiptLedger = new DeliveryReceiptLedger();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  routeRegistry.registerRoute(route);

  const courier = new CourierService({
    queueManager,
    policyEngine,
    vehicleSelector,
    routeRegistry,
    receiptLedger,
    eventBus,
    healthRegistry,
  });

  return {
    queueManager,
    receiptLedger,
    eventBus,
    healthRegistry,
    courier,
  };
}

test("public route emits heartbeat on empty queue and updates route health", async () => {
  const route = createRoute();
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();

  const heartbeats: string[] = [];
  eventBus.on("routeHeartbeat", ({ routeId }) => {
    heartbeats.push(routeId);
  });

  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async () => {
      return;
    },
  });

  await runner.runSingleCycle();

  assert.deepEqual(heartbeats, [route.routeId]);
  const snapshot = healthRegistry.getRouteHealthSnapshot().find((entry) => entry.routeId === route.routeId);
  assert.ok(snapshot);
  assert.ok(snapshot.heartbeatAt);
  assert.equal(snapshot.failureCount, 0);
});

test("public route sequencing visits stops in configured order across cycles", async () => {
  const route = createRoute({ stops: ["cat-hub", "librarian-hub"] });
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();

  const picked: string[] = [];
  const pickedStops: string[] = [];

  queueManager.enqueueParcel("cat-hub", buildParcel("parcel-cat"));
  queueManager.enqueueParcel("librarian-hub", buildParcel("parcel-lib", { sourceNodeId: "librarian-hub" }));

  eventBus.on("parcelPicked", ({ parcel, stopId }) => {
    picked.push(parcel.parcelId);
    pickedStops.push(stopId);
  });

  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async () => {
      return;
    },
  });

  await runner.runSingleCycle();
  assert.deepEqual(picked, ["parcel-cat"]);
  assert.deepEqual(pickedStops, ["cat-hub"]);
  assert.equal(queueManager.getQueueSize("librarian-hub"), 1);

  await runner.runSingleCycle();

  assert.deepEqual(picked, ["parcel-cat", "parcel-lib"]);
  assert.deepEqual(pickedStops, ["cat-hub", "librarian-hub"]);
  assert.equal(queueManager.getQueueSize("librarian-hub"), 0);
});

test("pickup eligibility keeps ineligible parcel in stop queue", async () => {
  const route = createRoute({
    stops: ["cat-hub"],
    allowedSensitivity: ["public", "internal"],
  });
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();

  const delivered: string[] = [];
  queueManager.enqueueParcel("cat-hub", buildParcel("eligible-internal"));
  queueManager.enqueueParcel("cat-hub", buildParcel("ineligible-restricted", {}, "restricted"));

  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async (parcel) => {
      delivered.push(parcel.parcelId);
    },
  });

  await runner.runSingleCycle();

  assert.deepEqual(delivered, ["eligible-internal"]);
  assert.equal(queueManager.getQueueSize("cat-hub"), 1);
  const restrictedVisible = queueManager.inspectEligibleParcels("cat-hub", {
    allowedSensitivity: new Set(["restricted"]),
    maxRetryCount: 3,
  });
  assert.equal(restrictedVisible.length, 1);
  assert.equal(restrictedVisible[0]?.parcel.parcelId, "ineligible-restricted");
});

test("pickup limits respect per-stop and per-vehicle limits in current cycle behavior", async () => {
  const route = createRoute({
    stops: ["cat-hub"],
    maxParcelPickupPerStop: 2,
    maxParcelsInVehicle: 1,
  });
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();

  const delivered: string[] = [];
  queueManager.enqueueParcel("cat-hub", buildParcel("limit-1"));
  queueManager.enqueueParcel("cat-hub", buildParcel("limit-2"));
  queueManager.enqueueParcel("cat-hub", buildParcel("limit-3"));

  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async (parcel) => {
      delivered.push(parcel.parcelId);
    },
  });

  await runner.runSingleCycle();

  assert.equal(delivered.length, 1);
  assert.equal(queueManager.getQueueSize("cat-hub"), 1);
});

test("delivery correctness updates receipt ledger with route checkpoint progression", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const deps = createCourierDeps(route);
  const parcel = buildParcel("delivery-route-checkpoint");

  const queuedReceipt = await deps.courier.dispatchParcel(parcel);
  assert.equal(queuedReceipt.status, "queued");

  const runner = new PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
    onDeliver: async (pickedParcel, routeId) => {
      await deps.courier.markDeliveredByRoute(pickedParcel, routeId);
    },
  });

  await runner.runSingleCycle();

  const finalReceipt = deps.receiptLedger.getByParcelId(parcel.parcelId);
  assert.ok(finalReceipt);
  assert.equal(finalReceipt.status, "delivered");
  assert.equal(finalReceipt.targetNode, "librarian-hub");
  assert.equal(finalReceipt.checkpoints.length, 2);
  assert.equal(finalReceipt.checkpoints[1]?.location, route.routeId);
  assert.equal(finalReceipt.checkpoints[1]?.note, "delivered_by_public_route");
});

test("receipt transitions cover queued/in_transit/delivered and rejected; failed path not emitted by current runtime", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const deps = createCourierDeps(route);

  const statusEvents = new Map<string, string[]>();
  deps.eventBus.on("receiptCreated", ({ receipt }) => {
    const statuses = statusEvents.get(receipt.parcelId) ?? [];
    statuses.push(receipt.status);
    statusEvents.set(receipt.parcelId, statuses);
  });

  const publicParcel = buildParcel("state-public");
  const highPriorityParcel = buildParcel("state-high", { priority: "high" });
  const rejectedParcel = buildParcel("state-rejected", {
    sourceNodeClass: "governance",
    sourceNodeId: "governance-hub",
    targetNodeClass: "execution",
    targetNodeId: "execution-hub",
  });

  const queued = await deps.courier.dispatchParcel(publicParcel);
  assert.equal(queued.status, "queued");

  const dedicated = await deps.courier.dispatchParcel(highPriorityParcel);
  assert.equal(dedicated.status, "delivered");

  const rejected = await deps.courier.dispatchParcel(rejectedParcel);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.reason, "governance_execution_requires_emergency_tunnel");

  const runner = new PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
    onDeliver: async (parcel, routeId) => {
      await deps.courier.markDeliveredByRoute(parcel, routeId);
    },
  });
  await runner.runSingleCycle();

  const publicFinal = deps.receiptLedger.getByParcelId(publicParcel.parcelId);
  assert.equal(publicFinal?.status, "delivered");
  assert.deepEqual(statusEvents.get(publicParcel.parcelId), ["queued"]);
  assert.deepEqual(statusEvents.get(highPriorityParcel.parcelId), ["in_transit"]);
  assert.deepEqual(statusEvents.get(rejectedParcel.parcelId), ["rejected"]);

  const hasFailed = deps.courier.getReceipts().some((receipt) => receipt.status === "failed");
  assert.equal(hasFailed, false);
});

test("retry counter increments and parcel remains queued when retry eligibility exceeded", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  const parcel = buildParcel("retry-exceeded");

  queueManager.enqueueParcel("cat-hub", parcel);
  queueManager.incrementRetry("cat-hub", parcel.parcelId);
  queueManager.incrementRetry("cat-hub", parcel.parcelId);
  queueManager.incrementRetry("cat-hub", parcel.parcelId);
  queueManager.incrementRetry("cat-hub", parcel.parcelId);

  const before = queueManager.inspectEligibleParcels("cat-hub", {
    allowedSensitivity: new Set(["internal"]),
    maxRetryCount: 10,
  });
  assert.equal(before.length, 1);
  assert.equal(before[0]?.retryCount, 4);

  const delivered: string[] = [];
  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async (picked) => {
      delivered.push(picked.parcelId);
    },
  });

  await runner.runSingleCycle();

  assert.deepEqual(delivered, []);
  assert.equal(queueManager.getQueueSize("cat-hub"), 1);
});

test("mixed parcel scenario keeps public route deterministic while dedicated dispatch handles secure/emergency", async () => {
  const route = createRoute({ stops: ["cat-hub", "librarian-hub", "learner-hub"] });
  const deps = createCourierDeps(route);

  const publicParcel = buildParcel("mixed-public", {
    sourceNodeClass: "cat",
    sourceNodeId: "cat-hub",
    targetNodeClass: "librarian",
    targetNodeId: "librarian-hub",
    priority: "normal",
    profile: {
      sizeClass: "small",
      sensitivity: "internal",
      replayable: true,
      requiresChainOfCustody: false,
    },
  });
  const secureParcel = buildParcel("mixed-secure", {
    sourceNodeClass: "cat",
    sourceNodeId: "cat-hub",
    targetNodeClass: "learner",
    targetNodeId: "learner-hub",
    priority: "high",
    profile: {
      sizeClass: "small",
      sensitivity: "confidential",
      replayable: true,
      requiresChainOfCustody: false,
    },
  });
  const emergencyParcel = buildParcel("mixed-emergency", {
    sourceNodeClass: "governance",
    sourceNodeId: "governance-hub",
    targetNodeClass: "execution",
    targetNodeId: "execution-hub",
    priority: "emergency",
    profile: {
      sizeClass: "small",
      sensitivity: "governance",
      replayable: false,
      requiresChainOfCustody: true,
    },
  });

  const [publicReceipt, secureReceipt, emergencyReceipt] = await Promise.all([
    deps.courier.dispatchParcel(publicParcel),
    deps.courier.dispatchParcel(secureParcel),
    deps.courier.dispatchParcel(emergencyParcel),
  ]);

  assert.equal(publicReceipt.status, "queued");
  assert.equal(secureReceipt.status, "delivered");
  assert.equal(emergencyReceipt.status, "delivered");

  const pickedIds: string[] = [];
  deps.eventBus.on("parcelPicked", ({ parcel }) => {
    pickedIds.push(parcel.parcelId);
  });

  const runner = new PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
    onDeliver: async (parcel, routeId) => {
      await deps.courier.markDeliveredByRoute(parcel, routeId);
    },
  });
  await runner.runSingleCycle();

  const publicFinal = deps.receiptLedger.getByParcelId(publicParcel.parcelId);
  const secureFinal = deps.receiptLedger.getByParcelId(secureParcel.parcelId);
  const emergencyFinal = deps.receiptLedger.getByParcelId(emergencyParcel.parcelId);

  assert.deepEqual(pickedIds, [publicParcel.parcelId]);
  assert.equal(publicFinal?.status, "delivered");
  assert.equal(secureFinal?.vehicle, "secure-private-car");
  assert.equal(secureFinal?.status, "delivered");
  assert.equal(emergencyFinal?.vehicle, "rocket");
  assert.equal(emergencyFinal?.status, "delivered");
});

test("courier enforces runtime guard safe mode redirect before queue or dedicated dispatch", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const queueManager = new StopQueueManager();
  const policyEngine = new ParcelPolicyEngine();
  const vehicleSelector = new VehicleSelector();
  const routeRegistry = new RouteRegistry();
  const receiptLedger = new DeliveryReceiptLedger();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  routeRegistry.registerRoute(route);

  class RedirectGuard extends RuntimeGuard {
    override evaluate(input: Parameters<RuntimeGuard["evaluate"]>[0]) {
      return super.evaluate({
        ...input,
        safeMode: true,
        policyFlags: { ...(input.policyFlags ?? {}), allowInSafeMode: false, allowDegradedInSafeMode: false },
      });
    }
  }

  const courier = new CourierService({
    queueManager,
    policyEngine,
    vehicleSelector,
    routeRegistry,
    receiptLedger,
    eventBus,
    healthRegistry,
    runtimeGuard: new RedirectGuard(),
  });

  const parcel = buildParcel("guard-safe-mode");
  const receipt = await courier.dispatchParcel(parcel);

  assert.equal(receipt.status, "rejected");
  assert.equal(receipt.reason, "runtime_guard_safe_mode_redirect");
  assert.equal(queueManager.getQueueSize("cat-hub"), 0);
  const ledgerEntries = courier
    .getExecutionLedgerSnapshot()
    .filter((entry) => entry.ids.executionId === parcel.parcelId);
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "runtime.guard.evaluated"), true);
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "execution.denied"), true);
});

test("courier degraded allow enforces dedicated dispatch instead of public queue", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const queueManager = new StopQueueManager();
  const policyEngine = new ParcelPolicyEngine();
  const vehicleSelector = new VehicleSelector();
  const routeRegistry = new RouteRegistry();
  const receiptLedger = new DeliveryReceiptLedger();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  routeRegistry.registerRoute(route);

  class DegradedGuard extends RuntimeGuard {
    override evaluate(input: Parameters<RuntimeGuard["evaluate"]>[0]) {
      return super.evaluate({
        ...input,
        policyFlags: { ...(input.policyFlags ?? {}), forceDegraded: true },
      });
    }
  }

  const courier = new CourierService({
    queueManager,
    policyEngine,
    vehicleSelector,
    routeRegistry,
    receiptLedger,
    eventBus,
    healthRegistry,
    runtimeGuard: new DegradedGuard(),
  });

  const parcel = buildParcel("guard-degraded-allow");
  const receipt = await courier.dispatchParcel(parcel);

  assert.equal(receipt.status, "delivered");
  assert.notEqual(receipt.vehicle, "public-bus");
  assert.equal(queueManager.getQueueSize("cat-hub"), 0);
});

test("courier dispatch guard deny blocks dispatch before runtime guard path", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const queueManager = new StopQueueManager();
  const policyEngine = new ParcelPolicyEngine();
  const vehicleSelector = new VehicleSelector();
  const routeRegistry = new RouteRegistry();
  const receiptLedger = new DeliveryReceiptLedger();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  routeRegistry.registerRoute(route);

  class DenyDispatchGuard extends DispatchGuard {
    override evaluate(input: Parameters<DispatchGuard["evaluate"]>[0]) {
      return super.evaluate({ ...input, policyFlags: { ...(input.policyFlags ?? {}), explicitDeny: true } });
    }
  }

  class CountingRuntimeGuard extends RuntimeGuard {
    public calls = 0;
    override evaluate(input: Parameters<RuntimeGuard["evaluate"]>[0]) {
      this.calls += 1;
      return super.evaluate(input);
    }
  }

  const runtimeGuard = new CountingRuntimeGuard();
  const courier = new CourierService({
    queueManager,
    policyEngine,
    vehicleSelector,
    routeRegistry,
    receiptLedger,
    eventBus,
    healthRegistry,
    runtimeGuard,
    dispatchGuard: new DenyDispatchGuard(),
  });

  const receipt = await courier.dispatchParcel(buildParcel("dispatch-guard-deny"));
  assert.equal(receipt.status, "rejected");
  assert.equal(receipt.reason?.includes("dispatch_guard_denied"), true);
  assert.equal(runtimeGuard.calls, 0);
  assert.equal(queueManager.getQueueSize("cat-hub"), 0);
  const ledgerEntries = courier
    .getExecutionLedgerSnapshot()
    .filter((entry) => entry.ids.executionId === "dispatch-guard-deny");
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "dispatch.denied"), true);
});

test("courier dispatch guard reroute enforces secure dispatch fallback", async () => {
  const route = createRoute({ stops: ["cat-hub"] });
  const queueManager = new StopQueueManager();
  const policyEngine = new ParcelPolicyEngine();
  const vehicleSelector = new VehicleSelector();
  const routeRegistry = new RouteRegistry();
  const receiptLedger = new DeliveryReceiptLedger();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();
  routeRegistry.registerRoute(route);

  class RerouteDispatchGuard extends DispatchGuard {
    override evaluate(input: Parameters<DispatchGuard["evaluate"]>[0]) {
      return super.evaluate({
        ...input,
        policyFlags: {
          ...(input.policyFlags ?? {}),
          forceRerouteTo: { mode: "secure_dispatch", target: "secure_fallback" },
        },
      });
    }
  }

  const courier = new CourierService({
    queueManager,
    policyEngine,
    vehicleSelector,
    routeRegistry,
    receiptLedger,
    eventBus,
    healthRegistry,
    dispatchGuard: new RerouteDispatchGuard(),
  });

  const receipt = await courier.dispatchParcel(buildParcel("dispatch-guard-reroute"));
  assert.equal(receipt.status, "delivered");
  assert.equal(receipt.vehicle, "secure-private-car");
  assert.equal(queueManager.getQueueSize("cat-hub"), 0);
  const ledgerEntries = courier
    .getExecutionLedgerSnapshot()
    .filter((entry) => entry.ids.executionId === "dispatch-guard-reroute");
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "dispatch.guard.evaluated"), true);
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "side_effect.completed"), true);
  assert.equal(ledgerEntries.some((entry) => entry.eventType === "execution.completed"), true);
});

test("benchmark: single route cycle processes bounded pickup set under 500ms", async () => {
  const route = createRoute({
    stops: ["cat-hub"],
    maxParcelPickupPerStop: 500,
    maxParcelsInVehicle: 500,
  });
  const queueManager = new StopQueueManager();
  const eventBus = new MessageEventBus();
  const healthRegistry = new TransportHealthRegistry();

  for (let i = 0; i < 1000; i += 1) {
    queueManager.enqueueParcel("cat-hub", buildParcel(`bench-${i}`));
  }

  const runner = new PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
    onDeliver: async () => {
      return;
    },
  });

  const t0 = performance.now();
  await runner.runSingleCycle();
  const elapsedMs = performance.now() - t0;

  assert.ok(elapsedMs < 500, `single-cycle elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
});
