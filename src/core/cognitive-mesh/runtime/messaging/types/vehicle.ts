import type { MeshTunnelType } from "./tunnel";

export type VehicleType =
  | "cycle"
  | "public-bus"
  | "private-car"
  | "secure-private-car"
  | "train"
  | "ship"
  | "plane"
  | "secured-plane"
  | "rocket";

export type VehicleServiceMode = "public-route" | "private-dispatch" | "secure-dispatch" | "emergency-dispatch";

export interface MeshVehicle {
  vehicleId: string;
  vehicleType: VehicleType;
  serviceMode: VehicleServiceMode;
  tunnel: MeshTunnelType;
  capacity: number;
  active: boolean;
  heartbeat: string;
}
