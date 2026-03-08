"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInteractivePublicBusRoute = createInteractivePublicBusRoute;
function createInteractivePublicBusRoute() {
    return {
        routeId: "route-interactive-public-bus",
        tunnel: "interactive",
        vehicleType: "public-bus",
        serviceName: "interactive-public-bus",
        stops: ["cat-hub", "router-hub", "librarian-hub", "learner-hub"],
        loopIntervalMs: 700,
        maxParcelPickupPerStop: 5,
        maxParcelsInVehicle: 20,
        allowedSensitivity: ["public", "internal", "confidential"],
        active: true,
    };
}
