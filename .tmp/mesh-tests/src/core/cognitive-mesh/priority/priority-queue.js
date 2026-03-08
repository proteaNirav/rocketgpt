"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityQueue = void 0;
class PriorityQueue {
    constructor(options) {
        this.buckets = {
            p0: [],
            p1: [],
            p2: [],
            p3: [],
        };
        this.now = options?.now ?? (() => Date.now());
    }
    enqueue(item, decision) {
        const entry = {
            id: item.id,
            queueClass: decision.queueClass,
            decision,
            item,
            enqueuedAtTs: this.now(),
        };
        this.buckets[decision.queueClass].push(entry);
        return entry;
    }
    dequeue() {
        return this.buckets.p0.shift() ?? this.buckets.p1.shift() ?? this.buckets.p2.shift() ?? this.buckets.p3.shift();
    }
    size(queueClass) {
        if (queueClass) {
            return this.buckets[queueClass].length;
        }
        return this.buckets.p0.length + this.buckets.p1.length + this.buckets.p2.length + this.buckets.p3.length;
    }
    snapshot() {
        return {
            p0: this.buckets.p0.map((entry) => entry.id),
            p1: this.buckets.p1.map((entry) => entry.id),
            p2: this.buckets.p2.map((entry) => entry.id),
            p3: this.buckets.p3.map((entry) => entry.id),
            size: this.size(),
        };
    }
}
exports.PriorityQueue = PriorityQueue;
