"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalFactory = void 0;
const cognitive_signal_1 = require("./cognitive-signal");
const signal_priority_1 = require("./signal-priority");
class SignalFactory {
    constructor(options) {
        this.options = options;
        this.defaultPriority = options.defaultPriority ?? signal_priority_1.CognitiveSignalPriority.NORMAL;
        this.now = options.now ?? (() => new Date());
        this.idPrefix = options.idPrefix ?? "sig";
    }
    create(input) {
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
            context: (0, cognitive_signal_1.cloneSignalContext)(input.context),
        };
    }
}
exports.SignalFactory = SignalFactory;
SignalFactory.globalSequence = 0;
