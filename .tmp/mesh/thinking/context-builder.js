"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBuilder = void 0;
/**
 * ContextBuilder composes low-cost context text for planning.
 * This avoids expensive transforms on the request path.
 */
class ContextBuilder {
    build(event, memory) {
        const memoryText = memory.map((item) => item.content).join("\n");
        return [
            `event_id=${event.eventId}`,
            `session_id=${event.sessionId}`,
            `trust_class=${event.trustClass}`,
            `input=${event.normalizedInput}`,
            `memory=${memoryText}`,
        ].join("\n");
    }
}
exports.ContextBuilder = ContextBuilder;
