"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrivateCarVehicle = createPrivateCarVehicle;
let privateCarSequence = 0;
function createPrivateCarVehicle(tunnel) {
    return {
        vehicleId: `private-car-${++privateCarSequence}`,
        vehicleType: "private-car",
        serviceMode: "private-dispatch",
        tunnel,
        capacity: 1,
        active: true,
        heartbeat: new Date().toISOString(),
    };
}
