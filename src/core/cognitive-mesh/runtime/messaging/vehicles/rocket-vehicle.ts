import type { MeshVehicle } from "../types/vehicle";

let rocketSequence = 0;

export function createRocketVehicle(): MeshVehicle {
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
