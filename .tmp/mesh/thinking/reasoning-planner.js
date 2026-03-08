"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultReasoningPlanner = void 0;
/**
 * DefaultReasoningPlanner emits a minimal plan shell.
 * Advanced chain-of-thought and adaptive planning are deferred.
 */
class DefaultReasoningPlanner {
    async plan(event, _contextText) {
        const now = new Date().toISOString();
        return {
            planId: `plan_${event.eventId}`,
            sessionId: event.sessionId,
            eventId: event.eventId,
            syncActions: ["respond_with_guarded_shell"],
            asyncActions: ["enrich_indexes", "evaluate_learning", "archive_rotation"],
            trace: {
                traceId: `trace_${event.eventId}`,
                sessionId: event.sessionId,
                eventId: event.eventId,
                mode: event.processingMode,
                createdAt: now,
                steps: [
                    {
                        stepId: `step_${event.eventId}_1`,
                        kind: "foundation_planner",
                        summary: "Generated baseline split between sync and async actions",
                        createdAt: now,
                    },
                ],
            },
        };
    }
}
exports.DefaultReasoningPlanner = DefaultReasoningPlanner;
