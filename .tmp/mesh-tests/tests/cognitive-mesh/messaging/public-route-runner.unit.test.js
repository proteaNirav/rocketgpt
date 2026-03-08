"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_perf_hooks_1 = require("node:perf_hooks");
const node_test_1 = require("node:test");
const node_assert_1 = require("node:assert");
const courier_service_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/courier-service");
const delivery_receipt_ledger_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/delivery-receipt-ledger");
const message_event_bus_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/message-event-bus");
const parcel_policy_engine_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/parcel-policy-engine");
const route_registry_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/route-registry");
const public_route_runner_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/routes/public-route-runner");
const stop_queue_manager_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/stop-queue-manager");
const transport_health_registry_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/transport-health-registry");
const vehicle_selector_1 = require("../../../src/core/cognitive-mesh/runtime/messaging/vehicle-selector");
const runtime_guard_1 = require("../../../src/core/cognitive-mesh/runtime/runtime-guard");
const dispatch_guard_1 = require("../../../src/core/cognitive-mesh/runtime/dispatch-guard");
function createRoute(overrides = {}) {
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
function buildParcel(parcelId, overrides = {}, sensitivity = "internal") {
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
function createCourierDeps(route) {
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
    const vehicleSelector = new vehicle_selector_1.VehicleSelector();
    const routeRegistry = new route_registry_1.RouteRegistry();
    const receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    routeRegistry.registerRoute(route);
    const courier = new courier_service_1.CourierService({
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
(0, node_test_1.test)("public route emits heartbeat on empty queue and updates route health", async () => {
    const route = createRoute();
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    const heartbeats = [];
    eventBus.on("routeHeartbeat", ({ routeId }) => {
        heartbeats.push(routeId);
    });
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async () => {
            return;
        },
    });
    await runner.runSingleCycle();
    node_assert_1.strict.deepEqual(heartbeats, [route.routeId]);
    const snapshot = healthRegistry.getRouteHealthSnapshot().find((entry) => entry.routeId === route.routeId);
    node_assert_1.strict.ok(snapshot);
    node_assert_1.strict.ok(snapshot.heartbeatAt);
    node_assert_1.strict.equal(snapshot.failureCount, 0);
});
(0, node_test_1.test)("public route sequencing visits stops in configured order across cycles", async () => {
    const route = createRoute({ stops: ["cat-hub", "librarian-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    const picked = [];
    const pickedStops = [];
    queueManager.enqueueParcel("cat-hub", buildParcel("parcel-cat"));
    queueManager.enqueueParcel("librarian-hub", buildParcel("parcel-lib", { sourceNodeId: "librarian-hub" }));
    eventBus.on("parcelPicked", ({ parcel, stopId }) => {
        picked.push(parcel.parcelId);
        pickedStops.push(stopId);
    });
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async () => {
            return;
        },
    });
    await runner.runSingleCycle();
    node_assert_1.strict.deepEqual(picked, ["parcel-cat"]);
    node_assert_1.strict.deepEqual(pickedStops, ["cat-hub"]);
    node_assert_1.strict.equal(queueManager.getQueueSize("librarian-hub"), 1);
    await runner.runSingleCycle();
    node_assert_1.strict.deepEqual(picked, ["parcel-cat", "parcel-lib"]);
    node_assert_1.strict.deepEqual(pickedStops, ["cat-hub", "librarian-hub"]);
    node_assert_1.strict.equal(queueManager.getQueueSize("librarian-hub"), 0);
});
(0, node_test_1.test)("pickup eligibility keeps ineligible parcel in stop queue", async () => {
    const route = createRoute({
        stops: ["cat-hub"],
        allowedSensitivity: ["public", "internal"],
    });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    const delivered = [];
    queueManager.enqueueParcel("cat-hub", buildParcel("eligible-internal"));
    queueManager.enqueueParcel("cat-hub", buildParcel("ineligible-restricted", {}, "restricted"));
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async (parcel) => {
            delivered.push(parcel.parcelId);
        },
    });
    await runner.runSingleCycle();
    node_assert_1.strict.deepEqual(delivered, ["eligible-internal"]);
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 1);
    const restrictedVisible = queueManager.inspectEligibleParcels("cat-hub", {
        allowedSensitivity: new Set(["restricted"]),
        maxRetryCount: 3,
    });
    node_assert_1.strict.equal(restrictedVisible.length, 1);
    node_assert_1.strict.equal(restrictedVisible[0]?.parcel.parcelId, "ineligible-restricted");
});
(0, node_test_1.test)("pickup limits respect per-stop and per-vehicle limits in current cycle behavior", async () => {
    const route = createRoute({
        stops: ["cat-hub"],
        maxParcelPickupPerStop: 2,
        maxParcelsInVehicle: 1,
    });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    const delivered = [];
    queueManager.enqueueParcel("cat-hub", buildParcel("limit-1"));
    queueManager.enqueueParcel("cat-hub", buildParcel("limit-2"));
    queueManager.enqueueParcel("cat-hub", buildParcel("limit-3"));
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async (parcel) => {
            delivered.push(parcel.parcelId);
        },
    });
    await runner.runSingleCycle();
    node_assert_1.strict.equal(delivered.length, 1);
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 1);
});
(0, node_test_1.test)("delivery correctness updates receipt ledger with route checkpoint progression", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const deps = createCourierDeps(route);
    const parcel = buildParcel("delivery-route-checkpoint");
    const queuedReceipt = await deps.courier.dispatchParcel(parcel);
    node_assert_1.strict.equal(queuedReceipt.status, "queued");
    const runner = new public_route_runner_1.PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
        onDeliver: async (pickedParcel, routeId) => {
            await deps.courier.markDeliveredByRoute(pickedParcel, routeId);
        },
    });
    await runner.runSingleCycle();
    const finalReceipt = deps.receiptLedger.getByParcelId(parcel.parcelId);
    node_assert_1.strict.ok(finalReceipt);
    node_assert_1.strict.equal(finalReceipt.status, "delivered");
    node_assert_1.strict.equal(finalReceipt.targetNode, "librarian-hub");
    node_assert_1.strict.equal(finalReceipt.checkpoints.length, 2);
    node_assert_1.strict.equal(finalReceipt.checkpoints[1]?.location, route.routeId);
    node_assert_1.strict.equal(finalReceipt.checkpoints[1]?.note, "delivered_by_public_route");
});
(0, node_test_1.test)("receipt transitions cover queued/in_transit/delivered and rejected; failed path not emitted by current runtime", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const deps = createCourierDeps(route);
    const statusEvents = new Map();
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
    node_assert_1.strict.equal(queued.status, "queued");
    const dedicated = await deps.courier.dispatchParcel(highPriorityParcel);
    node_assert_1.strict.equal(dedicated.status, "delivered");
    const rejected = await deps.courier.dispatchParcel(rejectedParcel);
    node_assert_1.strict.equal(rejected.status, "rejected");
    node_assert_1.strict.equal(rejected.reason, "governance_execution_requires_emergency_tunnel");
    const runner = new public_route_runner_1.PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
        onDeliver: async (parcel, routeId) => {
            await deps.courier.markDeliveredByRoute(parcel, routeId);
        },
    });
    await runner.runSingleCycle();
    const publicFinal = deps.receiptLedger.getByParcelId(publicParcel.parcelId);
    node_assert_1.strict.equal(publicFinal?.status, "delivered");
    node_assert_1.strict.deepEqual(statusEvents.get(publicParcel.parcelId), ["queued"]);
    node_assert_1.strict.deepEqual(statusEvents.get(highPriorityParcel.parcelId), ["in_transit"]);
    node_assert_1.strict.deepEqual(statusEvents.get(rejectedParcel.parcelId), ["rejected"]);
    const hasFailed = deps.courier.getReceipts().some((receipt) => receipt.status === "failed");
    node_assert_1.strict.equal(hasFailed, false);
});
(0, node_test_1.test)("retry counter increments and parcel remains queued when retry eligibility exceeded", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
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
    node_assert_1.strict.equal(before.length, 1);
    node_assert_1.strict.equal(before[0]?.retryCount, 4);
    const delivered = [];
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async (picked) => {
            delivered.push(picked.parcelId);
        },
    });
    await runner.runSingleCycle();
    node_assert_1.strict.deepEqual(delivered, []);
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 1);
});
(0, node_test_1.test)("mixed parcel scenario keeps public route deterministic while dedicated dispatch handles secure/emergency", async () => {
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
    node_assert_1.strict.equal(publicReceipt.status, "queued");
    node_assert_1.strict.equal(secureReceipt.status, "delivered");
    node_assert_1.strict.equal(emergencyReceipt.status, "delivered");
    const pickedIds = [];
    deps.eventBus.on("parcelPicked", ({ parcel }) => {
        pickedIds.push(parcel.parcelId);
    });
    const runner = new public_route_runner_1.PublicRouteRunner(route, deps.queueManager, deps.eventBus, deps.healthRegistry, {
        onDeliver: async (parcel, routeId) => {
            await deps.courier.markDeliveredByRoute(parcel, routeId);
        },
    });
    await runner.runSingleCycle();
    const publicFinal = deps.receiptLedger.getByParcelId(publicParcel.parcelId);
    const secureFinal = deps.receiptLedger.getByParcelId(secureParcel.parcelId);
    const emergencyFinal = deps.receiptLedger.getByParcelId(emergencyParcel.parcelId);
    node_assert_1.strict.deepEqual(pickedIds, [publicParcel.parcelId]);
    node_assert_1.strict.equal(publicFinal?.status, "delivered");
    node_assert_1.strict.equal(secureFinal?.vehicle, "secure-private-car");
    node_assert_1.strict.equal(secureFinal?.status, "delivered");
    node_assert_1.strict.equal(emergencyFinal?.vehicle, "rocket");
    node_assert_1.strict.equal(emergencyFinal?.status, "delivered");
});
(0, node_test_1.test)("courier enforces runtime guard safe mode redirect before queue or dedicated dispatch", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
    const vehicleSelector = new vehicle_selector_1.VehicleSelector();
    const routeRegistry = new route_registry_1.RouteRegistry();
    const receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    routeRegistry.registerRoute(route);
    class RedirectGuard extends runtime_guard_1.RuntimeGuard {
        evaluate(input) {
            return super.evaluate({
                ...input,
                safeMode: true,
                policyFlags: { ...(input.policyFlags ?? {}), allowInSafeMode: false, allowDegradedInSafeMode: false },
            });
        }
    }
    const courier = new courier_service_1.CourierService({
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
    node_assert_1.strict.equal(receipt.status, "rejected");
    node_assert_1.strict.equal(receipt.reason, "runtime_guard_safe_mode_redirect");
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 0);
    const ledgerEntries = courier
        .getExecutionLedgerSnapshot()
        .filter((entry) => entry.ids.executionId === parcel.parcelId);
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "runtime.guard.evaluated"), true);
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "execution.denied"), true);
});
(0, node_test_1.test)("courier degraded allow enforces dedicated dispatch instead of public queue", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
    const vehicleSelector = new vehicle_selector_1.VehicleSelector();
    const routeRegistry = new route_registry_1.RouteRegistry();
    const receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    routeRegistry.registerRoute(route);
    class DegradedGuard extends runtime_guard_1.RuntimeGuard {
        evaluate(input) {
            return super.evaluate({
                ...input,
                policyFlags: { ...(input.policyFlags ?? {}), forceDegraded: true },
            });
        }
    }
    const courier = new courier_service_1.CourierService({
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
    node_assert_1.strict.equal(receipt.status, "delivered");
    node_assert_1.strict.notEqual(receipt.vehicle, "public-bus");
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 0);
});
(0, node_test_1.test)("courier dispatch guard deny blocks dispatch before runtime guard path", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
    const vehicleSelector = new vehicle_selector_1.VehicleSelector();
    const routeRegistry = new route_registry_1.RouteRegistry();
    const receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    routeRegistry.registerRoute(route);
    class DenyDispatchGuard extends dispatch_guard_1.DispatchGuard {
        evaluate(input) {
            return super.evaluate({ ...input, policyFlags: { ...(input.policyFlags ?? {}), explicitDeny: true } });
        }
    }
    class CountingRuntimeGuard extends runtime_guard_1.RuntimeGuard {
        constructor() {
            super(...arguments);
            this.calls = 0;
        }
        evaluate(input) {
            this.calls += 1;
            return super.evaluate(input);
        }
    }
    const runtimeGuard = new CountingRuntimeGuard();
    const courier = new courier_service_1.CourierService({
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
    node_assert_1.strict.equal(receipt.status, "rejected");
    node_assert_1.strict.equal(receipt.reason?.includes("dispatch_guard_denied"), true);
    node_assert_1.strict.equal(runtimeGuard.calls, 0);
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 0);
    const ledgerEntries = courier
        .getExecutionLedgerSnapshot()
        .filter((entry) => entry.ids.executionId === "dispatch-guard-deny");
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "dispatch.denied"), true);
});
(0, node_test_1.test)("courier dispatch guard reroute enforces secure dispatch fallback", async () => {
    const route = createRoute({ stops: ["cat-hub"] });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
    const vehicleSelector = new vehicle_selector_1.VehicleSelector();
    const routeRegistry = new route_registry_1.RouteRegistry();
    const receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    routeRegistry.registerRoute(route);
    class RerouteDispatchGuard extends dispatch_guard_1.DispatchGuard {
        evaluate(input) {
            return super.evaluate({
                ...input,
                policyFlags: {
                    ...(input.policyFlags ?? {}),
                    forceRerouteTo: { mode: "secure_dispatch", target: "secure_fallback" },
                },
            });
        }
    }
    const courier = new courier_service_1.CourierService({
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
    node_assert_1.strict.equal(receipt.status, "delivered");
    node_assert_1.strict.equal(receipt.vehicle, "secure-private-car");
    node_assert_1.strict.equal(queueManager.getQueueSize("cat-hub"), 0);
    const ledgerEntries = courier
        .getExecutionLedgerSnapshot()
        .filter((entry) => entry.ids.executionId === "dispatch-guard-reroute");
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "dispatch.guard.evaluated"), true);
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "side_effect.completed"), true);
    node_assert_1.strict.equal(ledgerEntries.some((entry) => entry.eventType === "execution.completed"), true);
});
(0, node_test_1.test)("benchmark: single route cycle processes bounded pickup set under 500ms", async () => {
    const route = createRoute({
        stops: ["cat-hub"],
        maxParcelPickupPerStop: 500,
        maxParcelsInVehicle: 500,
    });
    const queueManager = new stop_queue_manager_1.StopQueueManager();
    const eventBus = new message_event_bus_1.MessageEventBus();
    const healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
    for (let i = 0; i < 1000; i += 1) {
        queueManager.enqueueParcel("cat-hub", buildParcel(`bench-${i}`));
    }
    const runner = new public_route_runner_1.PublicRouteRunner(route, queueManager, eventBus, healthRegistry, {
        onDeliver: async () => {
            return;
        },
    });
    const t0 = node_perf_hooks_1.performance.now();
    await runner.runSingleCycle();
    const elapsedMs = node_perf_hooks_1.performance.now() - t0;
    node_assert_1.strict.ok(elapsedMs < 500, `single-cycle elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
});
