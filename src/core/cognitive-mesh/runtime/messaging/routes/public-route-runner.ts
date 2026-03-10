import type { MessageEventBus } from "../message-event-bus";
import type { StopQueueManager } from "../stop-queue-manager";
import type { CognitiveParcel } from "../types/parcel";
import type { RouteDefinition } from "../types/route";
import type { TransportHealthRegistry } from "../transport-health-registry";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface PublicRouteRunnerHooks {
  onDeliver: (parcel: CognitiveParcel, routeId: string, stopId: string) => Promise<void>;
}

export class PublicRouteRunner {
  private active = false;
  private loopPromise: Promise<void> | undefined;
  private stopCursor = 0;

  constructor(
    private readonly route: RouteDefinition,
    private readonly queueManager: StopQueueManager,
    private readonly eventBus: MessageEventBus,
    private readonly healthRegistry: TransportHealthRegistry,
    private readonly hooks: PublicRouteRunnerHooks
  ) {}

  start(): void {
    if (this.active || !this.route.active) {
      return;
    }
    this.stopCursor = 0;
    this.active = true;
    this.eventBus.emit("routeStarted", { route: this.route });
    this.loopPromise = this.runLoop();
  }

  async stop(): Promise<void> {
    this.active = false;
    await this.loopPromise;
  }

  private async runLoop(): Promise<void> {
    while (this.active) {
      await this.runSingleCycle();
      await sleep(this.route.loopIntervalMs);
    }
  }

  async runSingleCycle(): Promise<void> {
    try {
      if (this.route.stops.length === 0) {
        throw new Error("route_has_no_stops");
      }

      const stopId = this.route.stops[this.stopCursor % this.route.stops.length];
      this.stopCursor += 1;

      const eligibleEntries = this.queueManager.dequeueEligibleParcels(stopId, this.route.maxParcelPickupPerStop, {
        allowedSensitivity: new Set(this.route.allowedSensitivity),
        maxRetryCount: 3,
      });

      for (const entry of eligibleEntries.slice(0, this.route.maxParcelsInVehicle)) {
        this.eventBus.emit("parcelPicked", { parcel: entry.parcel, routeId: this.route.routeId, stopId });
        await this.hooks.onDeliver(entry.parcel, this.route.routeId, stopId);
      }

      const heartbeatAt = new Date().toISOString();
      this.healthRegistry.markRouteHeartbeat(this.route.routeId);
      this.eventBus.emit("routeHeartbeat", { routeId: this.route.routeId, at: heartbeatAt });
    } catch (error) {
      this.healthRegistry.markRouteFailure(this.route.routeId, error instanceof Error ? error.message : "unknown_error");
    }
  }
}
