import type { CognitiveParcel, ParcelSensitivity } from "./types/parcel";

export interface StopQueueEntry {
  parcel: CognitiveParcel;
  retryCount: number;
  enqueuedAt: string;
}

export interface QueueEligibilityOptions {
  allowedSensitivity?: ReadonlySet<ParcelSensitivity>;
  maxRetryCount?: number;
}

export class StopQueueManager {
  private readonly queues = new Map<string, StopQueueEntry[]>();

  enqueueParcel(stopId: string, parcel: CognitiveParcel): StopQueueEntry {
    const queue = this.queues.get(stopId) ?? [];
    const entry: StopQueueEntry = {
      parcel,
      retryCount: 0,
      enqueuedAt: new Date().toISOString(),
    };
    queue.push(entry);
    this.queues.set(stopId, queue);
    return entry;
  }

  dequeueEligibleParcels(stopId: string, limit: number, options: QueueEligibilityOptions = {}): StopQueueEntry[] {
    const queue = this.queues.get(stopId) ?? [];
    if (queue.length === 0 || limit <= 0) {
      return [];
    }

    const picked: StopQueueEntry[] = [];
    const remaining: StopQueueEntry[] = [];

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

  inspectEligibleParcels(stopId: string, options: QueueEligibilityOptions = {}): StopQueueEntry[] {
    return (this.queues.get(stopId) ?? []).filter((entry) => this.isEligible(entry, options));
  }

  incrementRetry(stopId: string, parcelId: string): void {
    const queue = this.queues.get(stopId) ?? [];
    for (const entry of queue) {
      if (entry.parcel.parcelId === parcelId) {
        entry.retryCount += 1;
        entry.parcel.updatedAt = new Date().toISOString();
        return;
      }
    }
  }

  getQueueSize(stopId: string): number {
    return (this.queues.get(stopId) ?? []).length;
  }

  private isEligible(entry: StopQueueEntry, options: QueueEligibilityOptions): boolean {
    const sensitivityOkay =
      !options.allowedSensitivity || options.allowedSensitivity.has(entry.parcel.profile.sensitivity);
    const retryOkay = options.maxRetryCount == null || entry.retryCount <= options.maxRetryCount;
    return sensitivityOkay && retryOkay;
  }
}
