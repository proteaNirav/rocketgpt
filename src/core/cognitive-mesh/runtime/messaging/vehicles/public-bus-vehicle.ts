import type { MeshTunnelType } from "../types/tunnel";
import type { MeshVehicle } from "../types/vehicle";

let publicBusSequence = 0;

export function createPublicBusVehicle(tunnel: MeshTunnelType, capacity: number): MeshVehicle {
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
