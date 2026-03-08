"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopQueueManager = void 0;
class StopQueueManager {
    constructor() {
        this.queues = new Map();
    }
    enqueueParcel(stopId, parcel) {
        const queue = this.queues.get(stopId) ?? [];
        const entry = {
            parcel,
            retryCount: 0,
            enqueuedAt: new Date().toISOString(),
        };
        queue.push(entry);
        this.queues.set(stopId, queue);
        return entry;
    }
    dequeueEligibleParcels(stopId, limit, options = {}) {
        const queue = this.queues.get(stopId) ?? [];
        if (queue.length === 0 || limit <= 0) {
            return [];
        }
        const picked = [];
        const remaining = [];
        for (const entry of queue) {
            const eligible = this.isEligible(entry, options);
            if (eligible && picked.length < limit) {
                picked.push(entry);
                continue;
            }
            remaining.push(entry);
        }
        this.queues.set(stopId, remaining);
        return picked;
    }
    inspectEligibleParcels(stopId, options = {}) {
        return (this.queues.get(stopId) ?? []).filter((entry) => this.isEligible(entry, options));
    }
    incrementRetry(stopId, parcelId) {
        const queue = this.queues.get(stopId) ?? [];
        for (const entry of queue) {
            if (entry.parcel.parcelId === parcelId) {
                entry.retryCount += 1;
                entry.parcel.updatedAt = new Date().toISOString();
                return;
            }
        }
    }
    getQueueSize(stopId) {
        return (this.queues.get(stopId) ?? []).length;
    }
    isEligible(entry, options) {
        const sensitivityOkay = !options.allowedSensitivity || options.allowedSensitivity.has(entry.parcel.profile.sensitivity);
        const retryOkay = options.maxRetryCount == null || entry.retryCount <= options.maxRetryCount;
        return sensitivityOkay && retryOkay;
    }
}
exports.StopQueueManager = StopQueueManager;
