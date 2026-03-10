import type { PriorityDecision, PriorityQueueClass, PriorityQueueSnapshot } from "./priority-types";

export interface PrioritizedQueueEntry<T> {
  id: string;
  queueClass: PriorityQueueClass;
  decision: PriorityDecision;
  item: T;
  enqueuedAtTs: number;
}

interface PriorityQueueOptions {
  now?: () => number;
}

export class PriorityQueue<T extends { id: string }> {
  private readonly buckets: Record<PriorityQueueClass, PrioritizedQueueEntry<T>[]> = {
    p0: [],
    p1: [],
    p2: [],
    p3: [],
  };
  private readonly now: () => number;

  constructor(options?: PriorityQueueOptions) {
    this.now = options?.now ?? (() => Date.now());
  }

  enqueue(item: T, decision: PriorityDecision): PrioritizedQueueEntry<T> {
    const entry: PrioritizedQueueEntry<T> = {
      id: item.id,
      queueClass: decision.queueClass,
      decision,
      item,
      enqueuedAtTs: this.now(),
    };
    this.buckets[decision.queueClass].push(entry);
    return entry;
  }

  dequeue(): PrioritizedQueueEntry<T> | undefined {
    return this.buckets.p0.shift() ?? this.buckets.p1.shift() ?? this.buckets.p2.shift() ?? this.buckets.p3.shift();
  }

  size(queueClass?: PriorityQueueClass): number {
    if (queueClass) {
      return this.buckets[queueClass].length;
    }
    return this.buckets.p0.length + this.buckets.p1.length + this.buckets.p2.length + this.buckets.p3.length;
  }

  snapshot(): PriorityQueueSnapshot {
    return {
      p0: this.buckets.p0.map((entry) => entry.id),
      p1: this.buckets.p1.map((entry) => entry.id),
      p2: this.buckets.p2.map((entry) => entry.id),
      p3: this.buckets.p3.map((entry) => entry.id),
      size: this.size(),
    };
  }
}

