"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicRouteRunner = void 0;
const sleep = async (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});
class PublicRouteRunner {
    constructor(route, queueManager, eventBus, healthRegistry, hooks) {
        this.route = route;
        this.queueManager = queueManager;
        this.eventBus = eventBus;
        this.healthRegistry = healthRegistry;
        this.hooks = hooks;
        this.active = false;
        this.stopCursor = 0;
    }
    start() {
        if (this.active || !this.route.active) {
            return;
        }
        this.stopCursor = 0;
        this.active = true;
        this.eventBus.emit("routeStarted", { route: this.route });
        this.loopPromise = this.runLoop();
    }
    async stop() {
        this.active = false;
        await this.loopPromise;
    }
    async runLoop() {
        while (this.active) {
            await this.runSingleCycle();
            await sleep(this.route.loopIntervalMs);
        }
    }
    async runSingleCycle() {
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
        }
        catch (error) {
            this.healthRegistry.markRouteFailure(this.route.routeId, error instanceof Error ? error.message : "unknown_error");
        }
    }
}
exports.PublicRouteRunner = PublicRouteRunner;
