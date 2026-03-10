import type { CognitiveParcel } from "./types/parcel";
import type { DeliveryCheckpoint, DeliveryReceipt, DeliveryReceiptStatus } from "./types/receipt";
import type { MeshTunnelType } from "./types/tunnel";
import type { VehicleType } from "./types/vehicle";

export class DeliveryReceiptLedger {
  private readonly receipts = new Map<string, DeliveryReceipt>();
  private readonly parcelToReceipt = new Map<string, string>();
  private sequence = 0;

  createReceipt(
    parcel: CognitiveParcel,
    vehicle: VehicleType,
    tunnel: MeshTunnelType,
    status: DeliveryReceiptStatus,
    reason?: string
  ): DeliveryReceipt {
    const receipt: DeliveryReceipt = {
      receiptId: `rcpt-${Date.now()}-${++this.sequence}`,
      parcelId: parcel.parcelId,
      sourceNode: parcel.sourceNodeId,
      targetNode: parcel.targetNodeId,
      vehicle,
      tunnel,
      status,
      checkpoints: [
        {
          timestamp: new Date().toISOString(),
          location: parcel.sourceNodeId,
          note: `receipt_created:${status}`,
        },
      ],
      createdAt: new Date().toISOString(),
      reason,
    };
    this.receipts.set(receipt.receiptId, receipt);
    this.parcelToReceipt.set(parcel.parcelId, receipt.receiptId);
    return receipt;
  }

  updateStatus(parcelId: string, status: DeliveryReceiptStatus, checkpoint?: DeliveryCheckpoint, reason?: string): void {
    const receipt = this.getByParcelId(parcelId);
    if (!receipt) {
      return;
    }
    receipt.status = status;
    if (checkpoint) {
      receipt.checkpoints.push(checkpoint);
    }
    if (status === "delivered") {
      receipt.deliveredAt = new Date().toISOString();
    }
    if (reason) {
      receipt.reason = reason;
    }
  }

  getByParcelId(parcelId: string): DeliveryReceipt | undefined {
    const receiptId = this.parcelToReceipt.get(parcelId);
    return receiptId ? this.receipts.get(receiptId) : undefined;
  }

  getAllReceipts(): DeliveryReceipt[] {
    return [...this.receipts.values()];
  }
}
