"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMeshJobDispatcher = void 0;
/**
 * Job dispatcher for async mesh responsibilities.
 * Queue workers are intentionally lightweight in V1-02.
 */
class CognitiveMeshJobDispatcher {
    constructor(worker) {
        this.worker = worker;
        this.queue = [];
    }
    async dispatch(event, kind, payload = {}) {
        const job = {
            jobId: `job_${kind}_${event.eventId}_${Date.now()}`,
            eventId: event.eventId,
            sessionId: event.sessionId,
            kind,
            payload: {
                trustClass: event.trustClass,
                sourceType: event.sourceType,
                ...payload,
            },
            queuedAt: new Date().toISOString(),
        };
        this.queue.push(job);
        if (this.worker) {
            Promise.resolve().then(() => this.worker?.(job)).catch(() => {
                // Worker failures are intentionally non-blocking on request path.
            });
        }
        return job;
    }
    peek(limit = 50) {
        return this.queue.slice(0, limit);
    }
}
exports.CognitiveMeshJobDispatcher = CognitiveMeshJobDispatcher;
