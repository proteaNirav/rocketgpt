"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMeshJobDispatcher = void 0;
/**
 * Job dispatcher for async mesh responsibilities.
 * Real queue adapters are intentionally deferred.
 */
class CognitiveMeshJobDispatcher {
    async dispatch(event, kind) {
        return {
            jobId: `job_${kind}_${event.eventId}_${Date.now()}`,
            eventId: event.eventId,
            sessionId: event.sessionId,
            kind,
            payload: { trustClass: event.trustClass },
            queuedAt: new Date().toISOString(),
        };
    }
}
exports.CognitiveMeshJobDispatcher = CognitiveMeshJobDispatcher;
