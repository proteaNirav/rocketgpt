"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveMeshJobDispatcher = void 0;
const dispatch_guard_1 = require("../runtime/dispatch-guard");
const execution_ledger_1 = require("../runtime/execution-ledger");
/**
 * Job dispatcher for async mesh responsibilities.
 * Queue workers are intentionally lightweight in V1-02.
 */
class CognitiveMeshJobDispatcher {
    constructor(worker, dispatchGuard = new dispatch_guard_1.DispatchGuard(), executionLedger = (0, execution_ledger_1.getExecutionLedger)()) {
        this.worker = worker;
        this.dispatchGuard = dispatchGuard;
        this.executionLedger = executionLedger;
        this.queue = [];
    }
    async dispatch(event, kind, payload = {}) {
        let dispatchMode = "async";
        let normalizedKind = kind;
        let normalizedPayload = {
            trustClass: event.trustClass,
            sourceType: event.sourceType,
            ...payload,
        };
        try {
            const guarded = await (0, dispatch_guard_1.executeWithDispatchGuard)(this.dispatchGuard, {
                category: "mesh_job_dispatch",
                source: event.source,
                sourceType: event.sourceType,
                target: kind,
                targetKind: "internal",
                route: `mesh_job:${kind}`,
                mode: dispatchMode,
                targetTrustHint: event.trustClass === "blocked" ? "blocked" : event.trustClass === "quarantined" ? "quarantined" : "trusted",
                targetHealthHint: "healthy",
                sensitivityHints: [event.sourceType, ...(event.tags ?? [])],
                safeMode: event.metadata?.safeMode === true || event.metadata?.safe_mode === true,
                policyFlags: {
                    explicitDeny: payload["dispatchGuardDeny"] === true,
                    safeModeRedirect: true,
                    forceDegraded: payload["dispatchGuardForceDegraded"] === true,
                    requireAudit: payload["dispatchGuardRequireAudit"] === true,
                    forceRerouteTo: this.readReroutePlan(payload["dispatchGuardRerouteTo"]),
                },
                ids: {
                    correlationId: event.requestId,
                    executionId: event.eventId,
                    requestId: event.requestId,
                },
                protectedDispatch: true,
            }, {
                execute: () => Promise.resolve(),
                onSafeModeRedirect: () => {
                    normalizedKind = "quarantine-review";
                    normalizedPayload = {
                        ...normalizedPayload,
                        dispatchGuardOutcome: "safe_mode_redirect",
                        dispatchGuardReason: "safe_mode_dispatch_redirect",
                    };
                    return Promise.resolve();
                },
                onReroute: (decision) => {
                    const rerouteTarget = decision.reroute?.target;
                    if (rerouteTarget && this.isTaskKind(rerouteTarget)) {
                        normalizedKind = rerouteTarget;
                    }
                    else {
                        normalizedKind = "quarantine-review";
                    }
                    dispatchMode = decision.reroute?.mode ?? "async";
                    normalizedPayload = {
                        ...normalizedPayload,
                        dispatchGuardOutcome: "reroute",
                        dispatchGuardRerouteTarget: normalizedKind,
                    };
                    return Promise.resolve();
                },
                onDegradedAllow: () => {
                    normalizedPayload = {
                        ...normalizedPayload,
                        dispatchGuardOutcome: "degraded_allow",
                        dispatchGuardMode: "constrained",
                    };
                    return Promise.resolve();
                },
                onRequireAudit: () => {
                    normalizedPayload = {
                        ...normalizedPayload,
                        dispatchGuardOutcome: "require_audit",
                        dispatchAuditRequired: true,
                    };
                    return Promise.resolve();
                },
            });
            this.executionLedger.append({
                category: "dispatch",
                eventType: "dispatch.guard.evaluated",
                action: "mesh_job_dispatch",
                source: event.source,
                target: normalizedKind,
                ids: {
                    requestId: event.requestId,
                    executionId: event.eventId,
                    correlationId: event.requestId,
                    sessionId: event.sessionId,
                },
                mode: guarded.decision.outcome === "reroute"
                    ? "reroute"
                    : guarded.decision.outcome === "degraded_allow"
                        ? "degraded"
                        : guarded.decision.outcome === "safe_mode_redirect"
                            ? "safe_mode_redirect"
                            : guarded.decision.outcome === "require_audit"
                                ? "audit_required"
                                : "normal",
                status: "evaluated",
                guard: { dispatch: guarded.decision },
            });
            if (guarded.decision.outcome === "allow") {
                normalizedPayload = {
                    ...normalizedPayload,
                    dispatchGuardOutcome: "allow",
                };
            }
        }
        catch (error) {
            if (error instanceof dispatch_guard_1.DispatchGuardDeniedError) {
                this.executionLedger.append({
                    category: "dispatch",
                    eventType: "dispatch.denied",
                    action: "mesh_job_dispatch",
                    source: event.source,
                    target: kind,
                    ids: {
                        requestId: event.requestId,
                        executionId: event.eventId,
                        correlationId: event.requestId,
                        sessionId: event.sessionId,
                    },
                    mode: "normal",
                    status: "denied",
                    guard: { dispatch: error.decision },
                });
                throw new Error(error.message);
            }
            throw error;
        }
        return this.enqueueJob(event, normalizedKind, normalizedPayload, dispatchMode);
    }
    peek(limit = 50) {
        return this.queue.slice(0, limit);
    }
    enqueueJob(event, kind, payload, dispatchMode) {
        this.executionLedger.append({
            category: "dispatch",
            eventType: "dispatch.started",
            action: "mesh_job_enqueue",
            source: event.source,
            target: kind,
            ids: {
                requestId: event.requestId,
                executionId: event.eventId,
                correlationId: event.requestId,
                sessionId: event.sessionId,
            },
            mode: dispatchMode === "async" ? "normal" : "degraded",
            status: "started",
            sideEffect: { intent: true, completed: false, hints: ["job_queue_append"] },
        });
        const job = {
            jobId: `job_${kind}_${event.eventId}_${Date.now()}`,
            eventId: event.eventId,
            sessionId: event.sessionId,
            kind,
            payload: {
                ...payload,
                dispatchMode,
            },
            queuedAt: new Date().toISOString(),
        };
        this.queue.push(job);
        if (this.worker) {
            Promise.resolve().then(() => this.worker?.(job)).catch(() => {
                // Worker failures are intentionally non-blocking on request path.
            });
        }
        this.executionLedger.append({
            category: "dispatch",
            eventType: "dispatch.completed",
            action: "mesh_job_enqueue",
            source: event.source,
            target: kind,
            ids: {
                requestId: event.requestId,
                executionId: job.jobId,
                correlationId: event.requestId,
                sessionId: event.sessionId,
            },
            mode: dispatchMode === "async" ? "normal" : "degraded",
            status: "completed",
            sideEffect: { intent: true, completed: true, hints: ["job_queue_append"] },
            metadata: { queuedJobId: job.jobId },
        });
        return job;
    }
    isTaskKind(value) {
        return (value === "deepen-index" ||
            value === "summarize-session" ||
            value === "recall-compaction" ||
            value === "evaluate-learning-candidate" ||
            value === "quarantine-review");
    }
    readReroutePlan(value) {
        if (!value || typeof value !== "object") {
            return undefined;
        }
        const source = value;
        const target = typeof source.target === "string" && source.target.length > 0 ? source.target : undefined;
        const mode = this.isDispatchMode(source.mode) ? source.mode : undefined;
        if (!target && !mode) {
            return undefined;
        }
        return { target, mode };
    }
    isDispatchMode(value) {
        return (value === "sync" ||
            value === "async" ||
            value === "public_route" ||
            value === "private_dispatch" ||
            value === "secure_dispatch" ||
            value === "emergency_dispatch" ||
            value === "unknown");
    }
    getExecutionLedgerSnapshot() {
        return this.executionLedger.snapshot();
    }
    getCanonicalTimelineSnapshot() {
        return this.executionLedger.timelineSnapshot();
    }
}
exports.CognitiveMeshJobDispatcher = CognitiveMeshJobDispatcher;
