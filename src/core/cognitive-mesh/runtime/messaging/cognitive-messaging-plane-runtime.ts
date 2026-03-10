import { CourierService } from "./courier-service";
import { DeliveryReceiptLedger } from "./delivery-receipt-ledger";
import { MessageEventBus } from "./message-event-bus";
import { MessageSessionManager } from "./message-session-manager";
import { ParcelPolicyEngine } from "./parcel-policy-engine";
import { createInteractivePublicBusRoute } from "./routes/interactive-public-bus";
import { createLibrarianSyncBusRoute } from "./routes/librarian-sync-bus";
import { createMemoryShuttleRoute } from "./routes/memory-shuttle";
import { PublicRouteRunner } from "./routes/public-route-runner";
import { RouteRegistry } from "./route-registry";
import { StopQueueManager } from "./stop-queue-manager";
import { TransportHealthRegistry } from "./transport-health-registry";
import type { CognitiveParcel } from "./types/parcel";
import type { DeliveryReceipt } from "./types/receipt";
import { VehicleSelector } from "./vehicle-selector";

export class CognitiveMessagingPlaneRuntime {
  readonly queueManager = new StopQueueManager();
  readonly policyEngine = new ParcelPolicyEngine();
  readonly vehicleSelector = new VehicleSelector();
  readonly routeRegistry = new RouteRegistry();
  readonly receiptLedger = new DeliveryReceiptLedger();
  readonly eventBus = new MessageEventBus();
  readonly healthRegistry = new TransportHealthRegistry();
  readonly sessionManager = new MessageSessionManager();
  readonly courierService = new CourierService({
    queueManager: this.queueManager,
    policyEngine: this.policyEngine,
    vehicleSelector: this.vehicleSelector,
    routeRegistry: this.routeRegistry,
    receiptLedger: this.receiptLedger,
    eventBus: this.eventBus,
    healthRegistry: this.healthRegistry,
    sessionManager: this.sessionManager,
  });

  private readonly routeRunners: PublicRouteRunner[] = [];
  private started = false;

  constructor() {
    this.registerDefaultRoutes();
    this.createRouteRunners();
    this.attachConsoleTelemetry();
    this.start();
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    for (const runner of this.routeRunners) {
      runner.start();
    }
  }

  async stop(): Promise<void> {
    for (const runner of this.routeRunners) {
      await runner.stop();
    }
    this.started = false;
  }

  async submitParcel(parcel: CognitiveParcel): Promise<DeliveryReceipt> {
    return this.courierService.submitParcel(parcel);
  }

  getReceipts(): DeliveryReceipt[] {
    return this.courierService.getReceipts();
  }

  private registerDefaultRoutes(): void {
    this.routeRegistry.registerRoute(createInteractivePublicBusRoute());
    this.routeRegistry.registerRoute(createLibrarianSyncBusRoute());
    this.routeRegistry.registerRoute(createMemoryShuttleRoute());
  }

  private createRouteRunners(): void {
    const routes = this.routeRegistry.getAllRoutes().filter((route) => route.active && route.vehicleType === "public-bus");
    for (const route of routes) {
      const runner = new PublicRouteRunner(route, this.queueManager, this.eventBus, this.healthRegistry, {
        onDeliver: async (parcel, routeId) => {
          await this.courierService.markDeliveredByRoute(parcel, routeId);
        },
      });
      this.routeRunners.push(runner);
    }
  }

  private attachConsoleTelemetry(): void {
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
      console.log(
        `[messaging] parcel delivered: ${parcel.parcelId} to ${parcel.targetNodeId}` +
          `${routeId ? ` via ${routeId}` : ""} status=${receipt.status}`
      );
    });
    this.eventBus.on("parcelRejected", ({ parcel, reason }) => {
      console.log(`[messaging] parcel rejected: ${parcel.parcelId} reason=${reason}`);
    });
    this.eventBus.on("receiptCreated", ({ receipt }) => {
      console.log(`[messaging] receipt created: ${receipt.receiptId} parcel=${receipt.parcelId} status=${receipt.status}`);
    });
  }
}
