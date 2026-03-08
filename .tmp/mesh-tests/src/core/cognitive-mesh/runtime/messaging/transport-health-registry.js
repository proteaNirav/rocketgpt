"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransportHealthRegistry = void 0;
class TransportHealthRegistry {
    constructor() {
        this.routeHealth = new Map();
        this.vehicleHealth = new Map();
    }
    markRouteHeartbeat(routeId) {
        const current = this.routeHealth.get(routeId);
        this.routeHealth.set(routeId, {
            routeId,
            heartbeatAt: new Date().toISOString(),
            failureCount: current?.failureCount ?? 0,
            lastFailure: current?.lastFailure,
        });
    }
    markRouteFailure(routeId, reason) {
        const current = this.routeHealth.get(routeId);
        this.routeHealth.set(routeId, {
            routeId,
            heartbeatAt: current?.heartbeatAt,
            failureCount: (current?.failureCount ?? 0) + 1,
            lastFailure: `${new Date().toISOString()}: ${reason}`,
        });
    }
    registerVehicleHeartbeat(vehicleId, active) {
        this.vehicleHealth.set(vehicleId, {
            vehicleId,
            heartbeatAt: new Date().toISOString(),
            active,
        });
    }
    getRouteHealthSnapshot() {
        return [...this.routeHealth.values()];
    }
    getVehicleHealthSnapshot() {
        return [...this.vehicleHealth.values()];
    }
}
exports.TransportHealthRegistry = TransportHealthRegistry;
