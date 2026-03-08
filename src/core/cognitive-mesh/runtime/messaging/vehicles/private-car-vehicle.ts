import type { MeshTunnelType } from "../types/tunnel";
import type { MeshVehicle } from "../types/vehicle";

let privateCarSequence = 0;

export function createPrivateCarVehicle(tunnel: MeshTunnelType): MeshVehicle {
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
