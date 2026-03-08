import type { MeshTunnelType } from "../types/tunnel";
import type { MeshVehicle } from "../types/vehicle";

let secureSequence = 0;

export function createSecurePrivateCarVehicle(tunnel: MeshTunnelType): MeshVehicle {
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
