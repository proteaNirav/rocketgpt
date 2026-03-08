"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRocketVehicle = createRocketVehicle;
let rocketSequence = 0;
function createRocketVehicle() {
    return {
        vehicleId: `rocket-${++rocketSequence}`,
        vehicleType: "rocket",
        serviceMode: "emergency-dispatch",
        tunnel: "emergency",
        capacity: 1,
        active: true,
        heartbeat: new Date().toISOString(),
    };
}
