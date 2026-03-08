import type { CognitiveEvent } from "../types/cognitive-event";
import {
  DispatchGuard,
  DispatchGuardDeniedError,
  executeWithDispatchGuard,
  type DispatchMode,
} from "../runtime/dispatch-guard";
import { ExecutionLedger, getExecutionLedger } from "../runtime/execution-ledger";

export type CognitiveMeshTaskKind =
  | "deepen-index"
  | "summarize-session"
  | "recall-compaction"
  | "evaluate-learning-candidate"
  | "quarantine-review";

export interface CognitiveMeshJob {
  jobId: string;
  eventId: string;
  sessionId: string;
  kind: CognitiveMeshTaskKind;
  payload: Record<string, unknown>;
  queuedAt: string;
}

/**
 * Job dispatcher for async mesh responsibilities.
 * Queue workers are intentionally lightweight in V1-02.
 */
export class CognitiveMeshJobDispatcher {
  private readonly queue: CognitiveMeshJob[] = [];

  constructor(
    private readonly worker?: (job: CognitiveMeshJob) => Promise<void> | void,
    private readonly dispatchGuard = new DispatchGuard(),
    private readonly executionLedger: ExecutionLedger = getExecutionLedger()
  ) {}

  async dispatch(
    event: CognitiveEvent,
    kind: CognitiveMeshJob["kind"],
    payload: Record<string, unknown> = {}
  ): Promise<CognitiveMeshJob> {
    let dispatchMode: DispatchMode = "async";
    let normalizedKind = kind;
    let normalizedPayload: Record<string, unknown> = {
      trustClass: event.trustClass,
      sourceType: event.sourceType,
      ...payload,
    };

    try {
      const guarded = await executeWithDispatchGuard(this.dispatchGuard, {
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
          } else {
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
        mode:
          guarded.decision.outcome === "reroute"
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
    } catch (error) {
      if (error instanceof DispatchGuardDeniedError) {
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

  peek(limit = 50): CognitiveMeshJob[] {
    return this.queue.slice(0, limit);
  }

  private enqueueJob(
    event: CognitiveEvent,
    kind: CognitiveMeshJob["kind"],
    payload: Record<string, unknown>,
    dispatchMode: DispatchMode
  ): CognitiveMeshJob {
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
    const job: CognitiveMeshJob = {
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

  private isTaskKind(value: string): value is CognitiveMeshTaskKind {
    return (
      value === "deepen-index" ||
      value === "summarize-session" ||
      value === "recall-compaction" ||
      value === "evaluate-learning-candidate" ||
      value === "quarantine-review"
    );
  }

  private readReroutePlan(value: unknown): { target?: string; mode?: DispatchMode } | undefined {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    const source = value as Record<string, unknown>;
    const target = typeof source.target === "string" && source.target.length > 0 ? source.target : undefined;
    const mode = this.isDispatchMode(source.mode) ? source.mode : undefined;
    if (!target && !mode) {
      return undefined;
    }
    return { target, mode };
  }

  private isDispatchMode(value: unknown): value is DispatchMode {
    return (
      value === "sync" ||
      value === "async" ||
      value === "public_route" ||
      value === "private_dispatch" ||
      value === "secure_dispatch" ||
      value === "emergency_dispatch" ||
      value === "unknown"
    );
  }

  getExecutionLedgerSnapshot() {
    return this.executionLedger.snapshot();
  }

  getCanonicalTimelineSnapshot() {
    return this.executionLedger.timelineSnapshot();
  }
}
