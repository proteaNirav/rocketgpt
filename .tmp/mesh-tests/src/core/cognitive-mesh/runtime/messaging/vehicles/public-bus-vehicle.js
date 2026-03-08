"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPublicBusVehicle = createPublicBusVehicle;
let publicBusSequence = 0;
function createPublicBusVehicle(tunnel, capacity) {
    return {
        vehicleId: `public-bus-${++publicBusSequence}`,
        vehicleType: "public-bus",
        serviceMode: "public-route",
        tunnel,
        capacity,
        active: true,
        heartbeat: new Date().toISOString(),
    };
}
