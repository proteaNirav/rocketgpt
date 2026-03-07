import type { CognitiveSignal } from "./signal-types";
import type { CognitiveSignalType } from "./signal-types";
import type { SignalSubscriptionType } from "./cognitive-signal";

export type SignalSubscriberHandler<TSignal extends CognitiveSignal = CognitiveSignal> = (
  signal: TSignal
) => void | Promise<void>;

export interface SignalSubscription {
  subscriptionId: number;
  signalType: SignalSubscriptionType;
}

export type SignalDropReason =
  | "rate_limited"
  | "max_chain_depth_exceeded"
  | "fanout_limit_exceeded"
  | "invalid_signal";

export interface SignalObserverCallbacks {
  onObserved?: (signal: CognitiveSignal, fanout: number) => void;
  onDropped?: (signal: CognitiveSignal, reason: SignalDropReason) => void;
}

export type TypedSignalSubscriber<TType extends CognitiveSignalType> = SignalSubscriberHandler;

