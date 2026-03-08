"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecurePrivateCarVehicle = createSecurePrivateCarVehicle;
let secureSequence = 0;
function createSecurePrivateCarVehicle(tunnel) {
    return {
        vehicleId: `secure-private-car-${++secureSequence}`,
        vehicleType: "secure-private-car",
        serviceMode: "secure-dispatch",
        tunnel,
        capacity: 1,
        active: true,
        heartbeat: new Date().toISOString(),
    };
}
