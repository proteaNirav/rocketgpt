"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryReceiptLedger = void 0;
class DeliveryReceiptLedger {
    constructor() {
        this.receipts = new Map();
        this.parcelToReceipt = new Map();
        this.sequence = 0;
    }
    createReceipt(parcel, vehicle, tunnel, status, reason) {
        const receipt = {
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
    updateStatus(parcelId, status, checkpoint, reason) {
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
    getByParcelId(parcelId) {
        const receiptId = this.parcelToReceipt.get(parcelId);
        return receiptId ? this.receipts.get(receiptId) : undefined;
    }
    getAllReceipts() {
        return [...this.receipts.values()];
    }
}
exports.DeliveryReceiptLedger = DeliveryReceiptLedger;
