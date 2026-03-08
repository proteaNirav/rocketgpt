import type { MeshTunnelType } from "./tunnel";
import type { VehicleType } from "./vehicle";

export type DeliveryReceiptStatus = "queued" | "in_transit" | "delivered" | "failed" | "rejected";

export interface DeliveryCheckpoint {
  timestamp: string;
  location: string;
  note: string;
}

export interface DeliveryReceipt {
  receiptId: string;
  parcelId: string;
  sourceNode: string;
  targetNode: string;
  vehicle: VehicleType;
  tunnel: MeshTunnelType;
  status: DeliveryReceiptStatus;
  checkpoints: DeliveryCheckpoint[];
  createdAt: string;
  deliveredAt?: string;
  reason?: string;
}
