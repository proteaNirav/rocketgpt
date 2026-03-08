"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMessagingPlaneRuntime = void 0;
const courier_service_1 = require("./courier-service");
const delivery_receipt_ledger_1 = require("./delivery-receipt-ledger");
const message_event_bus_1 = require("./message-event-bus");
const message_session_manager_1 = require("./message-session-manager");
const parcel_policy_engine_1 = require("./parcel-policy-engine");
const interactive_public_bus_1 = require("./routes/interactive-public-bus");
const librarian_sync_bus_1 = require("./routes/librarian-sync-bus");
const memory_shuttle_1 = require("./routes/memory-shuttle");
const public_route_runner_1 = require("./routes/public-route-runner");
const route_registry_1 = require("./route-registry");
const stop_queue_manager_1 = require("./stop-queue-manager");
const transport_health_registry_1 = require("./transport-health-registry");
const vehicle_selector_1 = require("./vehicle-selector");
class CognitiveMessagingPlaneRuntime {
    constructor() {
        this.queueManager = new stop_queue_manager_1.StopQueueManager();
        this.policyEngine = new parcel_policy_engine_1.ParcelPolicyEngine();
        this.vehicleSelector = new vehicle_selector_1.VehicleSelector();
        this.routeRegistry = new route_registry_1.RouteRegistry();
        this.receiptLedger = new delivery_receipt_ledger_1.DeliveryReceiptLedger();
        this.eventBus = new message_event_bus_1.MessageEventBus();
        this.healthRegistry = new transport_health_registry_1.TransportHealthRegistry();
        this.sessionManager = new message_session_manager_1.MessageSessionManager();
        this.courierService = new courier_service_1.CourierService({
            queueManager: this.queueManager,
            policyEngine: this.policyEngine,
            vehicleSelector: this.vehicleSelector,
            routeRegistry: this.routeRegistry,
            receiptLedger: this.receiptLedger,
            eventBus: this.eventBus,
            healthRegistry: this.healthRegistry,
            sessionManager: this.sessionManager,
        });
        this.routeRunners = [];
        this.started = false;
        this.registerDefaultRoutes();
        this.createRouteRunners();
        this.attachConsoleTelemetry();
        this.start();
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        for (const runner of this.routeRunners) {
            runner.start();
        }
    }
    async stop() {
        for (const runner of this.routeRunners) {
            await runner.stop();
        }
        this.started = false;
    }
    async submitParcel(parcel) {
        return this.courierService.submitParcel(parcel);
    }
    getReceipts() {
        return this.courierService.getReceipts();
    }
    registerDefaultRoutes() {
        this.routeRegistry.registerRoute((0, interactive_public_bus_1.createInteractivePublicBusRoute)());
        this.routeRegistry.registerRoute((0, librarian_sync_bus_1.createLibrarianSyncBusRoute)());
        this.routeRegistry.registerRoute((0, memory_shuttle_1.createMemoryShuttleRoute)());
    }
    createRouteRunners() {
        const routes = this.routeRegistry.getAllRoutes().filter((route) => route.active && route.vehicleType === "public-bus");
        for (const route of routes) {
            const runner = new public_route_runner_1.PublicRouteRunner(route, this.queueManager, this.eventBus, this.healthRegistry, {
                onDeliver: async (parcel, routeId) => {
                    await this.courierService.markDeliveredByRoute(parcel, routeId);
                },
            });
            this.routeRunners.push(runner);
        }
    }
    attachConsoleTelemetry() {
        this.eventBus.on("routeStarted", ({ route }) => {
            console.log(`[messaging] route start: ${route.routeId} (${route.serviceName})`);
        });
        this.eventBus.on("routeHeartbeat", ({ routeId, at }) => {
            console.log(`[messaging] route heartbeat: ${routeId} at ${at}`);
        });
        this.eventBus.on("parcelQueued", ({ parcel, stopId }) => {
            console.log(`[messaging] parcel queued: ${parcel.parcelId} at stop ${stopId}`);
        });
        this.eventBus.on("parcelPicked", ({ parcel, routeId, stopId }) => {
            console.log(`[messaging] parcel picked: ${parcel.parcelId} on ${routeId} at ${stopId}`);
        });
        this.eventBus.on("vehicleDispatched", ({ parcel, vehicle }) => {
            console.log(`[messaging] vehicle dispatched: ${vehicle.vehicleType} for parcel ${parcel.parcelId}`);
        });
        this.eventBus.on("parcelDelivered", ({ parcel, routeId, receipt }) => {
            console.log(`[messaging] parcel delivered: ${parcel.parcelId} to ${parcel.targetNodeId}` +
                `${routeId ? ` via ${routeId}` : ""} status=${receipt.status}`);
        });
        this.eventBus.on("parcelRejected", ({ parcel, reason }) => {
            console.log(`[messaging] parcel rejected: ${parcel.parcelId} reason=${reason}`);
        });
        this.eventBus.on("receiptCreated", ({ receipt }) => {
            console.log(`[messaging] receipt created: ${receipt.receiptId} parcel=${receipt.parcelId} status=${receipt.status}`);
        });
    }
}
exports.CognitiveMessagingPlaneRuntime = CognitiveMessagingPlaneRuntime;
