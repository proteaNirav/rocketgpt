"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLibrarianSyncBusRoute = createLibrarianSyncBusRoute;
function createLibrarianSyncBusRoute() {
    return {
        routeId: "route-librarian-sync-bus",
        tunnel: "research",
        vehicleType: "public-bus",
        serviceName: "librarian-sync-bus",
        stops: ["librarian-hub", "research-hub", "memory-hub", "cat-hub"],
        loopIntervalMs: 1000,
        maxParcelPickupPerStop: 4,
        maxParcelsInVehicle: 12,
        allowedSensitivity: ["public", "internal"],
        active: true,
    };
}
