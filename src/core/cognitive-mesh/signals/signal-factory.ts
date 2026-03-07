import { cloneSignalContext } from "./cognitive-signal";
import { CognitiveSignalPriority } from "./signal-priority";
import type { CognitiveSignal, CognitiveSignalContext, CognitiveSignalType } from "./signal-types";

export interface SignalFactoryOptions {
  nodeId: string;
  defaultPriority?: CognitiveSignalPriority;
  now?: () => Date;
  idPrefix?: string;
}

export interface CreateSignalInput {
  signalType: CognitiveSignalType;
  correlationId: string;
  priority?: CognitiveSignalPriority;
  targetNodes?: string[];
  context?: CognitiveSignalContext;
}

export class SignalFactory {
  private static globalSequence = 0;
  private readonly now: () => Date;
  private readonly defaultPriority: CognitiveSignalPriority;
  private readonly idPrefix: string;

  constructor(private readonly options: SignalFactoryOptions) {
    this.defaultPriority = options.defaultPriority ?? CognitiveSignalPriority.NORMAL;
    this.now = options.now ?? (() => new Date());
    this.idPrefix = options.idPrefix ?? "sig";
  }

  create(input: CreateSignalInput): CognitiveSignal {
    const now = this.now();
    SignalFactory.globalSequence += 1;
    return {
      signalId: `${this.idPrefix}-${now.getTime()}-${SignalFactory.globalSequence}`,
      signalType: input.signalType,
      sourceNode: this.options.nodeId,
      targetNodes: input.targetNodes ? [...input.targetNodes] : undefined,
      timestamp: now.toISOString(),
      priority: input.priority ?? this.defaultPriority,
      correlationId: input.correlationId,
      context: cloneSignalContext(input.context),
    };
  }
}

