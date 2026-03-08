"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalRouter = void 0;
const cognitive_signal_1 = require("./cognitive-signal");
class SignalRouter {
    constructor(options) {
        this.subscribers = new Map();
        this.subscriptionSequence = 0;
        this.emitDepth = 0;
        this.windowStartMs = 0;
        this.windowCount = 0;
        this.rateLimitPerSecond = options?.rateLimitPerSecond ?? 200;
        this.maxChainDepth = options?.maxChainDepth ?? 8;
        this.maxFanout = options?.maxFanout ?? 32;
        this.observers = options?.observers;
        this.clock = options?.clock ?? (() => Date.now());
    }
    subscribe(signalType, handler) {
        this.subscriptionSequence += 1;
        const current = this.subscribers.get(signalType) ?? new Map();
        current.set(this.subscriptionSequence, handler);
        this.subscribers.set(signalType, current);
        return {
            subscriptionId: this.subscriptionSequence,
            signalType,
        };
    }
    unsubscribe(subscription) {
        const set = this.subscribers.get(subscription.signalType);
        if (!set) {
            return;
        }
        set.delete(subscription.subscriptionId);
        if (set.size === 0) {
            this.subscribers.delete(subscription.signalType);
        }
    }
    async emit(signal) {
        if (!(0, cognitive_signal_1.isCognitiveSignal)(signal)) {
            this.notifyDropped(signal, "invalid_signal");
            return false;
        }
        if (!this.checkRateLimit()) {
            this.notifyDropped(signal, "rate_limited");
            return false;
        }
        if (this.emitDepth >= this.maxChainDepth) {
            this.notifyDropped(signal, "max_chain_depth_exceeded");
            return false;
        }
        const routed = this.collectSubscribers(signal.signalType);
        if (routed.length > this.maxFanout) {
            this.notifyDropped(signal, "fanout_limit_exceeded");
            return false;
        }
        this.observers?.onObserved?.(signal, routed.length);
        this.emitDepth += 1;
        try {
            for (const subscriber of routed) {
                try {
                    await Promise.resolve(subscriber.handler(signal));
                }
                catch {
                    // Subscriber failures are isolated to keep signal transport safe.
                }
            }
        }
        finally {
            this.emitDepth -= 1;
        }
        return true;
    }
    collectSubscribers(type) {
        const typed = this.subscribers.get(type);
        const wildcard = this.subscribers.get(cognitive_signal_1.WILDCARD_SIGNAL);
        const routed = [];
        if (typed) {
            for (const [id, handler] of typed.entries()) {
                routed.push({ id, type, handler });
            }
        }
        if (wildcard) {
            for (const [id, handler] of wildcard.entries()) {
                routed.push({ id, type: cognitive_signal_1.WILDCARD_SIGNAL, handler });
            }
        }
        return routed.sort((a, b) => a.id - b.id);
    }
    checkRateLimit() {
        const now = this.clock();
        if (this.windowStartMs === 0 || now - this.windowStartMs >= 1000) {
            this.windowStartMs = now;
            this.windowCount = 0;
        }
        if (this.windowCount >= this.rateLimitPerSecond) {
            return false;
        }
        this.windowCount += 1;
        return true;
    }
    notifyDropped(signal, reason) {
        this.observers?.onDropped?.(signal, reason);
    }
}
exports.SignalRouter = SignalRouter;
