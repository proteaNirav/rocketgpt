import type { RouteDefinition } from "../types/route";

export function createInteractivePublicBusRoute(): RouteDefinition {
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
