import { isCognitiveSignal, WILDCARD_SIGNAL, type SignalSubscriptionType } from "./cognitive-signal";
import type {
  SignalDropReason,
  SignalObserverCallbacks,
  SignalSubscriberHandler,
  SignalSubscription,
} from "./signal-subscriber";
import { CognitiveSignalType, type CognitiveSignal } from "./signal-types";

interface SignalRouterOptions {
  rateLimitPerSecond?: number;
  maxChainDepth?: number;
  maxFanout?: number;
  observers?: SignalObserverCallbacks;
  clock?: () => number;
}

interface RoutedSubscriber {
  id: number;
  type: SignalSubscriptionType;
  handler: SignalSubscriberHandler;
}

export class SignalRouter {
  private readonly subscribers = new Map<SignalSubscriptionType, Map<number, SignalSubscriberHandler>>();
  private readonly rateLimitPerSecond: number;
  private readonly maxChainDepth: number;
  private readonly maxFanout: number;
  private readonly observers?: SignalObserverCallbacks;
  private readonly clock: () => number;
  private subscriptionSequence = 0;
  private emitDepth = 0;
  private windowStartMs = 0;
  private windowCount = 0;

  constructor(options?: SignalRouterOptions) {
    this.rateLimitPerSecond = options?.rateLimitPerSecond ?? 200;
    this.maxChainDepth = options?.maxChainDepth ?? 8;
    this.maxFanout = options?.maxFanout ?? 32;
    this.observers = options?.observers;
    this.clock = options?.clock ?? (() => Date.now());
  }

  subscribe<T extends CognitiveSignalType>(
    signalType: T,
    handler: SignalSubscriberHandler
  ): SignalSubscription;
  subscribe(signalType: typeof WILDCARD_SIGNAL, handler: SignalSubscriberHandler): SignalSubscription;
  subscribe(signalType: SignalSubscriptionType, handler: SignalSubscriberHandler): SignalSubscription {
    this.subscriptionSequence += 1;
    const current = this.subscribers.get(signalType) ?? new Map<number, SignalSubscriberHandler>();
    current.set(this.subscriptionSequence, handler);
    this.subscribers.set(signalType, current);
    return {
      subscriptionId: this.subscriptionSequence,
      signalType,
    };
  }

  unsubscribe(subscription: SignalSubscription): void {
    const set = this.subscribers.get(subscription.signalType);
    if (!set) {
      return;
    }
    set.delete(subscription.subscriptionId);
    if (set.size === 0) {
      this.subscribers.delete(subscription.signalType);
    }
  }

  async emit(signal: CognitiveSignal): Promise<boolean> {
    if (!isCognitiveSignal(signal)) {
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
        } catch {
          // Subscriber failures are isolated to keep signal transport safe.
        }
      }
    } finally {
      this.emitDepth -= 1;
    }
    return true;
  }

  private collectSubscribers(type: CognitiveSignalType): RoutedSubscriber[] {
    const typed = this.subscribers.get(type);
    const wildcard = this.subscribers.get(WILDCARD_SIGNAL);
    const routed: RoutedSubscriber[] = [];

    if (typed) {
      for (const [id, handler] of typed.entries()) {
        routed.push({ id, type, handler });
      }
    }
    if (wildcard) {
      for (const [id, handler] of wildcard.entries()) {
        routed.push({ id, type: WILDCARD_SIGNAL, handler });
      }
    }

    return routed.sort((a, b) => a.id - b.id);
  }

  private checkRateLimit(): boolean {
    const now = this.clock();
    if (this.windowStartMs === 0 || now - this.windowStartMs >= 1_000) {
      this.windowStartMs = now;
      this.windowCount = 0;
    }
    if (this.windowCount >= this.rateLimitPerSecond) {
      return false;
    }
    this.windowCount += 1;
    return true;
  }

  private notifyDropped(signal: CognitiveSignal, reason: SignalDropReason): void {
    this.observers?.onDropped?.(signal, reason);
  }
}

