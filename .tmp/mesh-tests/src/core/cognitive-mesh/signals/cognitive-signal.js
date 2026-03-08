"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WILDCARD_SIGNAL = void 0;
exports.isCognitiveSignal = isCognitiveSignal;
exports.cloneSignalContext = cloneSignalContext;
exports.WILDCARD_SIGNAL = "*";
function isCognitiveSignal(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value;
    return (typeof candidate.signalId === "string" &&
        typeof candidate.sourceNode === "string" &&
        typeof candidate.timestamp === "string" &&
        typeof candidate.correlationId === "string" &&
        candidate.signalType !== undefined);
}
function cloneSignalContext(context) {
    if (!context) {
        return undefined;
    }
    return {
        ...context,
        tags: context.tags ? [...context.tags] : undefined,
        metadata: context.metadata ? { ...context.metadata } : undefined,
    };
}
