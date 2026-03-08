"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryShuttleRoute = createMemoryShuttleRoute;
function createMemoryShuttleRoute() {
    return {
        routeId: "route-memory-shuttle",
        tunnel: "memory",
        vehicleType: "public-bus",
        serviceName: "memory-shuttle",
        stops: ["memory-hub", "planner-hub", "librarian-hub", "router-hub"],
        loopIntervalMs: 1200,
        maxParcelPickupPerStop: 3,
        maxParcelsInVehicle: 8,
        allowedSensitivity: ["public", "internal"],
        active: true,
    };
}
