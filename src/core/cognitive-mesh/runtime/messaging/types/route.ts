import type { ParcelSensitivity } from "./parcel";
import type { MeshTunnelType } from "./tunnel";
import type { VehicleType } from "./vehicle";

export interface RouteDefinition {
  routeId: string;
  tunnel: MeshTunnelType;
  vehicleType: VehicleType;
  serviceName: string;
  stops: string[];
  loopIntervalMs: number;
  maxParcelPickupPerStop: number;
  maxParcelsInVehicle: number;
  allowedSensitivity: ParcelSensitivity[];
  active: boolean;
}
