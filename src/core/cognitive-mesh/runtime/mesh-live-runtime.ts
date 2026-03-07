import { InputIngestor } from "../sensory/input-ingestor";
import {
  DECISION_CATEGORIES,
  REASONING_CONTEXT_TYPES,
  WORKING_MEMORY_KEYS,
} from "../brain/constants";
import { CAPABILITY_IDS } from "../capabilities/constants";
import type { CapabilityResultStatus } from "../capabilities/types/capability-result.types";
import type { VerificationVerdict } from "../capabilities/types/verification.types";
import {
  createDefaultCapabilityMeshOrchestrator,
  type CapabilityMeshOrchestrator,
} from "../capabilities/orchestration/capability-mesh-orchestrator";
import type { CapabilityRequestEnvelope } from "../capabilities/types/capability-request.types";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { SessionLifecycleManager } from "../brain/session-lifecycle-manager";
import type { SessionBrain } from "../brain/session-brain";
import { CognitiveMeshBrain } from "../integration/cognitive-mesh-brain";
import type { CognitiveEvent } from "../types/cognitive-event";
import { EXPERIENCE_SOURCE_COMPONENT } from "../experience/constants";
import { CognitiveExperienceCaptureService } from "../experience/services/cognitive-experience-capture-service";
import { ExperienceRetrievalService } from "../experience/services/experience-retrieval-service";
import { InMemoryExperienceRepository } from "../experience/repository/in-memory-experience-repository";
import type { ExperienceOutcomeClassification } from "../experience/types/experience.types";
import { NEGATIVE_PATH_ISSUES, type NegativePathIssueCode } from "../governance/negative-path-taxonomy";

export interface MeshWorkflowTriggerInput {
  sessionId: string;
  requestId?: string;
  routeType: string;
  rawInput: unknown;
  metadata?: Record<string, unknown>;
}

export interface MeshChatInput {
  sessionId: string;
  requestId?: string;
  routeType: string;
  rawInput: unknown;
  metadata?: Record<string, unknown>;
}

export interface MeshLiveRuntimeOptions {
  brain?: CognitiveMeshBrain;
  sessionLifecycleManager?: SessionLifecycleManager;
  autoDestroyTerminalSessions?: boolean;
  capabilityOrchestrator?: CapabilityMeshOrchestrator;
  capabilityFailureMode?: "fallback" | "strict";
  experienceCaptureService?: CognitiveExperienceCaptureService;
  experienceRetrievalService?: ExperienceRetrievalService;
}

interface RuntimeCapabilityTrace {
  capabilityId?: string;
  capabilityStatus: CapabilityResultStatus | "invocation_failed" | "none";
  verificationInvoked: boolean;
  verificationRequired: boolean;
  verificationDisposition: "passed" | "failed" | "downgraded" | "inconclusive" | "unavailable";
  verificationVerdict?: VerificationVerdict;
  confidence?: number;
  guardrailApplied: boolean;
  fallbackTriggered: boolean;
  governanceIssues: NegativePathIssueCode[];
  error?: string;
}

export class MeshLiveRuntime {
  private readonly brain?: CognitiveMeshBrain;
  private readonly sessionLifecycleManager: SessionLifecycleManager;
  private readonly autoDestroyTerminalSessions: boolean;
  private readonly capabilityOrchestrator: CapabilityMeshOrchestrator;
  private readonly capabilityFailureMode: "fallback" | "strict";
  private readonly experienceCaptureService: CognitiveExperienceCaptureService;
  private readonly experienceRetrievalService: ExperienceRetrievalService;

  constructor(
    private readonly ingestor = new InputIngestor(),
    private readonly router = new MeshRouter(),
    options?: MeshLiveRuntimeOptions
  ) {
    this.brain = options?.brain;
    this.sessionLifecycleManager = options?.sessionLifecycleManager ?? new SessionLifecycleManager();
    this.autoDestroyTerminalSessions = options?.autoDestroyTerminalSessions ?? false;
    this.capabilityOrchestrator = options?.capabilityOrchestrator ?? createDefaultCapabilityMeshOrchestrator();
    this.capabilityFailureMode = options?.capabilityFailureMode ?? "fallback";
    this.experienceCaptureService =
      options?.experienceCaptureService ?? new CognitiveExperienceCaptureService(new InMemoryExperienceRepository());
    this.experienceRetrievalService =
      options?.experienceRetrievalService ??
      new ExperienceRetrievalService(this.experienceCaptureService.getRepository());
  }

  async processWorkflowTrigger(input: MeshWorkflowTriggerInput): Promise<MeshRouteResult> {
    const init = this.initializeSessionForRequest(
      input.sessionId,
      input.routeType,
      input.rawInput,
      "workflow.trigger"
    );
    const sessionBrain = init.sessionBrain;

    const event = this.ingestor.ingest({
      sessionId: input.sessionId,
      requestId: input.requestId,
      source: "workflow:trigger",
      routeType: input.routeType,
      rawInput: input.rawInput,
      metadata: {
        ...input.metadata,
        sourceType: "workflow.trigger",
      },
      processingMode: "sync",
    });
    sessionBrain.getCognitiveState().transitionIfNotTerminal("planning", {
      source: "mesh-live-runtime",
      reason: "event_ingested",
    });
    let capabilityTrace: RuntimeCapabilityTrace = {
      capabilityStatus: "none",
      verificationInvoked: false,
      verificationRequired: false,
      verificationDisposition: "inconclusive",
      guardrailApplied: false,
      fallbackTriggered: false,
      governanceIssues: init.lifecycleViolation ? [NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION] : [],
    };
    try {
      capabilityTrace = await this.invokeCapabilityMesh(sessionBrain, event, "workflow");
      await this.ingestBrain(event);
      sessionBrain.getCognitiveState().transitionIfNotTerminal("executing", {
        source: "mesh-live-runtime",
        reason: "route_dispatch_started",
      });
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_STARTED,
        label: "workflow_route_execution_started",
        source: "mesh-live-runtime",
        metadata: {
          routeType: input.routeType,
        },
      });
      const result = await this.router.route(event);
      this.recordRouteOutcome(sessionBrain, result, "workflow");
      this.captureExperience(sessionBrain, event, result, capabilityTrace, "workflow", "completed");
      this.finalizeSessionState(input.sessionId, "completed", {
        reason: "workflow_route_finished",
        source: "mesh-live-runtime",
      });
      return result;
    } catch (error) {
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_FAILED,
        label: "workflow_route_execution_failed",
        source: "mesh-live-runtime",
        metadata: {
          routeType: input.routeType,
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.ROUTE_ERROR,
        decision: "workflow_route_failed",
        rationale: error instanceof Error ? error.message : "unknown_error",
        source: "mesh-live-runtime",
      });
      this.captureExperience(
        sessionBrain,
        event,
        undefined,
        {
          ...capabilityTrace,
          fallbackTriggered: capabilityTrace.fallbackTriggered,
          governanceIssues: [
            ...capabilityTrace.governanceIssues,
            ...(this.capabilityFailureMode === "strict" ? [NEGATIVE_PATH_ISSUES.FALLBACK_EXHAUSTED] : []),
          ],
          error: error instanceof Error ? error.message : "unknown_error",
        },
        "workflow",
        "failed"
      );
      this.finalizeSessionState(input.sessionId, "failed", {
        reason: "workflow_route_exception",
        source: "mesh-live-runtime",
      });
      throw error;
    }
  }

  async processChatUserRequest(input: MeshChatInput): Promise<MeshRouteResult> {
    const init = this.initializeSessionForRequest(
      input.sessionId,
      input.routeType,
      input.rawInput,
      "chat.user_text"
    );
    const sessionBrain = init.sessionBrain;

    const event = this.ingestor.ingest({
      sessionId: input.sessionId,
      requestId: input.requestId,
      source: "chat:user_text",
      routeType: input.routeType,
      rawInput: input.rawInput,
      metadata: {
        ...input.metadata,
        sourceType: "chat.user_text",
      },
      processingMode: "sync",
    });
    sessionBrain.getCognitiveState().transitionIfNotTerminal("planning", {
      source: "mesh-live-runtime",
      reason: "event_ingested",
    });
    let capabilityTrace: RuntimeCapabilityTrace = {
      capabilityStatus: "none",
      verificationInvoked: false,
      verificationRequired: false,
      verificationDisposition: "inconclusive",
      guardrailApplied: false,
      fallbackTriggered: false,
      governanceIssues: init.lifecycleViolation ? [NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION] : [],
    };
    try {
      capabilityTrace = await this.invokeCapabilityMesh(sessionBrain, event, "chat");
      await this.ingestBrain(event);
      sessionBrain.getCognitiveState().transitionIfNotTerminal("executing", {
        source: "mesh-live-runtime",
        reason: "route_dispatch_started",
      });
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_STARTED,
        label: "chat_route_execution_started",
        source: "mesh-live-runtime",
        metadata: {
          routeType: input.routeType,
        },
      });
      const result = await this.router.route(event);
      this.recordRouteOutcome(sessionBrain, result, "chat");
      this.captureExperience(sessionBrain, event, result, capabilityTrace, "chat", "completed");
      this.finalizeSessionState(input.sessionId, "completed", {
        reason: "chat_route_finished",
        source: "mesh-live-runtime",
      });
      return result;
    } catch (error) {
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_FAILED,
        label: "chat_route_execution_failed",
        source: "mesh-live-runtime",
        metadata: {
          routeType: input.routeType,
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.ROUTE_ERROR,
        decision: "chat_route_failed",
        rationale: error instanceof Error ? error.message : "unknown_error",
        source: "mesh-live-runtime",
      });
      this.captureExperience(
        sessionBrain,
        event,
        undefined,
        {
          ...capabilityTrace,
          fallbackTriggered: capabilityTrace.fallbackTriggered,
          governanceIssues: [
            ...capabilityTrace.governanceIssues,
            ...(this.capabilityFailureMode === "strict" ? [NEGATIVE_PATH_ISSUES.FALLBACK_EXHAUSTED] : []),
          ],
          error: error instanceof Error ? error.message : "unknown_error",
        },
        "chat",
        "failed"
      );
      this.finalizeSessionState(input.sessionId, "failed", {
        reason: "chat_route_exception",
        source: "mesh-live-runtime",
      });
      throw error;
    }
  }

  getMetricsSnapshot() {
    return this.router.getMetricsSnapshot();
  }

  getRepositorySnapshot() {
    return this.router.getRepositorySnapshot();
  }

  incrementMetric(name: "mesh_chat_hook_invoked"): void {
    this.router.incrementMetric(name);
  }

  getBrainQueueSnapshot() {
    return this.brain?.queueSnapshot();
  }

  getSessionBrainSnapshot(sessionId: string) {
    return this.sessionLifecycleManager.snapshot(sessionId);
  }

  destroySessionBrain(sessionId: string): boolean {
    return this.sessionLifecycleManager.destroySession(sessionId);
  }

  hasActiveSessionBrain(sessionId: string): boolean {
    return this.sessionLifecycleManager.hasActiveSession(sessionId);
  }

  destroySessionBrainIfTerminal(sessionId: string): boolean {
    return this.sessionLifecycleManager.destroySessionIfTerminal(sessionId);
  }

  getRecentExperiences(sessionId: string, limit = 20) {
    return this.experienceRetrievalService.getRecentExperiences(sessionId, limit);
  }

  getExperiencesByCapability(capabilityId: string, limit = 20) {
    return this.experienceRetrievalService.getExperiencesByCapability(capabilityId, limit);
  }

  getExperiencesByOutcome(classification: ExperienceOutcomeClassification, limit = 20) {
    return this.experienceRetrievalService.getExperiencesByOutcome(classification, limit);
  }

  getExperiencesByCircumstantialSignals(
    signals: Array<
      | "fallbackTriggered"
      | "guardrailApplied"
      | "verificationRequired"
      | "verificationFailed"
      | "multipleCapabilitiesUsed"
      | "highComplexityRequest"
      | "stateFragility"
      | "recoveryPathUsed"
      | "lowConfidenceResult"
    >,
    limit = 20
  ) {
    return this.experienceRetrievalService.findByCircumstantialSignals(signals, limit);
  }

  private async ingestBrain(event: CognitiveEvent): Promise<void> {
    if (!this.brain) {
      return;
    }
    try {
      await this.brain.ingest({
        id: event.eventId,
        source: event.source,
        kind: event.sourceType === "workflow.trigger" ? "workflow" : "task",
        urgency: event.processingMode === "sync" ? 0.8 : 0.5,
        uncertainty: event.trustClass === "trusted" ? 0.2 : 0.6,
        risk: event.risk.score,
        novelty: 0.4,
        userImpact: event.sourceType === "chat.user_text" ? 0.8 : 0.6,
        strategicValue: event.sourceType === "workflow.trigger" ? 0.75 : 0.5,
        importance: event.sourceType === "workflow.trigger" ? 0.8 : 0.6,
        estimatedCost: event.processingMode === "sync" ? 120 : 300,
        blockingFactor: event.processingMode === "sync" ? 0.7 : 0.4,
        retryCount: 0,
        correlationId: event.requestId ?? event.eventId,
        createdAtTs: Date.parse(event.occurredAt),
        metadata: {
          routeType: event.routeType,
          sourceType: event.sourceType,
          trustClass: event.trustClass,
        },
      });
    } catch {
      // Brain ingestion is optional and must not affect core request routing.
    }
  }

  private initializeSessionForRequest(
    sessionId: string,
    routeType: string,
    rawInput: unknown,
    sourceType: "workflow.trigger" | "chat.user_text"
  ): { sessionBrain: SessionBrain; lifecycleViolation: boolean } {
    const sessionBrain = this.sessionLifecycleManager.getOrCreateSession(sessionId);
    const transition = sessionBrain.getCognitiveState().transitionIfNotTerminal("understanding", {
      source: "mesh-live-runtime",
      reason: "request_received",
    });
    const lifecycleViolation = transition == null;
    sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_ROUTE_TYPE, routeType, {
      source: "mesh-live-runtime",
    });
    sessionBrain.getReasoningContext().add({
      type: REASONING_CONTEXT_TYPES.INPUT_RECEIVED,
      label: sourceType === "workflow.trigger" ? "workflow_input_received" : "chat_input_received",
      value: rawInput,
      source: "mesh-live-runtime",
      metadata: {
        routeType,
        sourceType,
      },
    });
    sessionBrain.getDecisionTrail().record({
      category: DECISION_CATEGORIES.ROUTE_SELECTION,
      decision: routeType,
      source: "mesh-live-runtime",
      rationale: "runtime_entrypoint_selected_route_type",
    });
    if (lifecycleViolation) {
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.ROUTE_ERROR,
        decision: "lifecycle_violation_detected",
        source: "mesh-live-runtime",
        rationale: "attempted_initialize_on_terminal_session",
      });
    }
    return { sessionBrain, lifecycleViolation };
  }

  private recordRouteOutcome(sessionBrain: SessionBrain, result: MeshRouteResult, mode: "workflow" | "chat"): void {
    sessionBrain.getCognitiveState().transitionIfNotTerminal("evaluating", {
      source: "mesh-live-runtime",
      reason: "route_result_received",
    });
    sessionBrain.getReasoningContext().add({
      type: REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_COMPLETED,
      label: `${mode}_route_execution_completed`,
      source: "mesh-live-runtime",
      metadata: {
        accepted: result.accepted,
        disposition: result.disposition,
      },
    });
    sessionBrain.getDecisionTrail().record({
      category: DECISION_CATEGORIES.ROUTE_OUTCOME,
      decision: result.disposition,
      confidence: result.accepted ? 0.9 : 0.4,
      source: "mesh-live-runtime",
      metadata: {
        accepted: result.accepted,
        riskScore: result.riskScore,
        syncPlanId: result.syncPlanId,
        asyncJobCount: result.asyncJobIds.length,
      },
    });
    sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_ROUTE_DISPOSITION, result.disposition, {
      source: "mesh-live-runtime",
    });
    sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_SYNC_PLAN_ID, result.syncPlanId ?? null, {
      source: "mesh-live-runtime",
    });
  }

  private finalizeSessionState(
    sessionId: string,
    outcome: "completed" | "failed",
    options: { reason?: string; source?: string } = {}
  ): void {
    this.sessionLifecycleManager.finalizeSession(sessionId, outcome, {
      reason: options.reason,
      source: options.source,
      destroyOnFinalize: this.autoDestroyTerminalSessions,
    });
  }

  private async invokeCapabilityMesh(
    sessionBrain: SessionBrain,
    event: CognitiveEvent,
    mode: "workflow" | "chat"
  ): Promise<RuntimeCapabilityTrace> {
    const capabilityId = mode === "chat" ? CAPABILITY_IDS.LANGUAGE : CAPABILITY_IDS.RETRIEVAL;
    const request: CapabilityRequestEnvelope = {
      requestId: `cap-${event.eventId}`,
      sessionId: event.sessionId,
      capabilityId,
      purpose: mode === "chat" ? "normalize_user_request" : "retrieve_runtime_context",
      input:
        mode === "chat"
          ? event.normalizedInput
          : {
              query: event.normalizedInput,
            },
      expectedOutputType: mode === "chat" ? "language-structured-text" : "retrieval-records",
      verificationMode: mode === "chat" ? "none" : "required",
      priority: "normal",
      trace: {
        sourceType: event.sourceType,
        routeType: event.routeType,
      },
      createdAt: new Date().toISOString(),
    };

    sessionBrain.getDecisionTrail().record({
      category: DECISION_CATEGORIES.CAPABILITY_SELECTION,
      decision: capabilityId,
      source: "mesh-live-runtime",
      rationale: `capability_selected_for_${mode}_flow`,
    });

    try {
      const outcome = await this.capabilityOrchestrator.invoke(request);
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED,
        label: `${mode}_capability_invoked`,
        source: "mesh-live-runtime",
        metadata: {
          capabilityId: outcome.capability.capabilityId,
          resultStatus: outcome.result.status,
          invokable: outcome.invokable,
          shouldCommit: outcome.shouldCommit,
          verificationDisposition: outcome.verificationDisposition,
          governanceIssues: outcome.governanceIssues,
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.CAPABILITY_OUTCOME,
        decision: outcome.result.status,
        source: "mesh-live-runtime",
        metadata: {
          capabilityId: outcome.capability.capabilityId,
          verificationRequired: outcome.result.verificationRequired,
          verificationDisposition: outcome.verificationDisposition,
          governanceIssues: outcome.governanceIssues,
        },
      });
      if (outcome.verification) {
        sessionBrain.getReasoningContext().add({
          type: REASONING_CONTEXT_TYPES.CAPABILITY_VERIFICATION,
          label: `${mode}_capability_verification`,
          source: "mesh-live-runtime",
          metadata: {
            capabilityId: outcome.capability.capabilityId,
            verdict: outcome.verification.verdict,
            confidence: outcome.verification.confidence,
          },
        });
        sessionBrain.getDecisionTrail().record({
          category: DECISION_CATEGORIES.CAPABILITY_VERDICT,
          decision: outcome.verification.verdict,
          source: "mesh-live-runtime",
          confidence: outcome.verification.confidence,
        });
      }

      if (outcome.shouldCommit && outcome.result.payload !== undefined) {
        sessionBrain.getWorkingMemory().set(
          `runtime.capability.${outcome.capability.capabilityId}.payload`,
          outcome.result.payload,
          { source: "mesh-live-runtime" }
        );
      }
      return {
        capabilityId: outcome.capability.capabilityId,
        capabilityStatus: outcome.result.status,
        verificationInvoked: Boolean(outcome.verification),
        verificationRequired: outcome.result.verificationRequired || Boolean(outcome.verification),
        verificationDisposition: outcome.verificationDisposition,
        verificationVerdict: outcome.verification?.verdict,
        confidence: outcome.verification?.confidence ?? outcome.result.confidence,
        guardrailApplied:
          outcome.result.status === "blocked" ||
          outcome.result.status === "unavailable" ||
          outcome.invokable === false,
        fallbackTriggered: false,
        governanceIssues: outcome.governanceIssues,
      };
    } catch (error) {
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED,
        label: `${mode}_capability_invocation_failed`,
        source: "mesh-live-runtime",
        metadata: {
          capabilityId,
          error: error instanceof Error ? error.message : "unknown_error",
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.CAPABILITY_OUTCOME,
        decision: "capability_invocation_failed",
        rationale: error instanceof Error ? error.message : "unknown_error",
        source: "mesh-live-runtime",
      });
      if (this.capabilityFailureMode === "strict") {
        throw error;
      }
      return {
        capabilityId,
        capabilityStatus: "invocation_failed",
        verificationInvoked: false,
        verificationRequired: false,
        verificationDisposition: "unavailable",
        guardrailApplied: false,
        fallbackTriggered: true,
        governanceIssues: [],
        error: error instanceof Error ? error.message : "unknown_error",
      };
    }
  }

  private captureExperience(
    sessionBrain: SessionBrain,
    event: CognitiveEvent,
    result: MeshRouteResult | undefined,
    capabilityTrace: RuntimeCapabilityTrace,
    mode: "workflow" | "chat",
    terminalState: "completed" | "failed"
  ): void {
    try {
      const routeFallbackUsed =
        capabilityTrace.fallbackTriggered ||
        Boolean(result?.reasons.includes("mesh_router_failure_isolated")) ||
        (result?.accepted === false && result?.disposition === "restrict");

      const capture = this.experienceCaptureService.captureExecutionExperience({
        sessionId: event.sessionId,
        timestamp: new Date().toISOString(),
        source: {
          component: EXPERIENCE_SOURCE_COMPONENT,
          source: event.source,
          requestId: event.requestId,
          eventId: event.eventId,
        },
        situation: {
          mode,
          routeType: event.routeType,
          sourceType: event.sourceType,
        },
        context: {
          cognitiveState: terminalState,
          trustClass: result?.trustClass ?? event.trustClass,
          riskScore: result?.riskScore ?? event.risk.score,
          tags: [...(event.tags ?? [])],
        },
        action: {
          capabilityId: capabilityTrace.capabilityId,
          capabilityStatus: capabilityTrace.capabilityStatus,
          verificationInvoked: capabilityTrace.verificationInvoked,
          routeDisposition: result?.disposition,
          routeAccepted: result?.accepted,
        },
        verification: {
          required: capabilityTrace.verificationRequired,
          verdict: capabilityTrace.verificationVerdict,
          confidence: capabilityTrace.confidence,
          notes: capabilityTrace.error ? [capabilityTrace.error] : undefined,
        },
        circumstances: {
          fallbackTriggered: routeFallbackUsed,
          guardrailApplied:
            capabilityTrace.guardrailApplied ||
            result?.disposition === "quarantine" ||
            result?.disposition === "block",
          verificationRequired: capabilityTrace.verificationRequired,
          verificationVerdict: capabilityTrace.verificationVerdict,
          capabilitiesUsed: capabilityTrace.capabilityId ? [capabilityTrace.capabilityId] : [],
          requestComplexityScore: Math.max(0, Math.min(1, event.risk.score)),
          stateFragility: terminalState === "failed",
          recoveryPathUsed: routeFallbackUsed,
          confidence: capabilityTrace.confidence,
        },
        routeError: terminalState === "failed" ? capabilityTrace.error : undefined,
        routeFallbackUsed,
        executionAborted: false,
        governanceIssues: [...new Set(capabilityTrace.governanceIssues)],
        tags: [
          `mode:${mode}`,
          `route:${event.routeType ?? "unknown"}`,
          `trust:${result?.trustClass ?? event.trustClass}`,
        ],
      });

      sessionBrain.getWorkingMemory().set(
        WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_STATUS,
        capture.captured ? "captured" : "skipped",
        { source: "mesh-live-runtime" }
      );
      sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_ERROR, null, {
        source: "mesh-live-runtime",
      });
      sessionBrain.getWorkingMemory().set(
        WORKING_MEMORY_KEYS.LAST_EXPERIENCE_ID,
        capture.captured ? capture.record.experienceId : null,
        { source: "mesh-live-runtime" }
      );
      sessionBrain.getWorkingMemory().set(
        WORKING_MEMORY_KEYS.LAST_EXPERIENCE_OUTCOME,
        capture.captured ? capture.record.outcome.classification : null,
        { source: "mesh-live-runtime" }
      );
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.EXPERIENCE_CAPTURED,
        label: `${mode}_experience_capture_evaluated`,
        source: "mesh-live-runtime",
        metadata: {
          captured: capture.captured,
          experienceId: capture.record.experienceId,
          classification: capture.record.outcome.classification,
          relevanceScore: capture.record.relevanceScore,
          isMeaningful: capture.record.isMeaningful,
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.EXPERIENCE_CAPTURE,
        decision: capture.captured ? capture.record.outcome.classification : "skipped",
        confidence: capture.record.relevanceScore,
        source: "mesh-live-runtime",
        metadata: {
          experienceId: capture.record.experienceId,
          isMeaningful: capture.record.isMeaningful,
          captured: capture.captured,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "capture_failed";
      sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_STATUS, "failed", {
        source: "mesh-live-runtime",
      });
      sessionBrain.getWorkingMemory().set(
        WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_ERROR,
        `${NEGATIVE_PATH_ISSUES.RUNTIME_CAPTURE_FAILED}:${errorMessage}`,
        {
        source: "mesh-live-runtime",
        }
      );
      sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_EXPERIENCE_ID, null, {
        source: "mesh-live-runtime",
      });
      sessionBrain.getWorkingMemory().set(WORKING_MEMORY_KEYS.LAST_EXPERIENCE_OUTCOME, null, {
        source: "mesh-live-runtime",
      });
      sessionBrain.getReasoningContext().add({
        type: REASONING_CONTEXT_TYPES.EXPERIENCE_CAPTURED,
        label: `${mode}_experience_capture_failed`,
        source: "mesh-live-runtime",
        metadata: {
          captured: false,
          error: errorMessage,
        },
      });
      sessionBrain.getDecisionTrail().record({
        category: DECISION_CATEGORIES.EXPERIENCE_CAPTURE,
        decision: "failed",
        source: "mesh-live-runtime",
        rationale: errorMessage,
      });
      // Experience capture must not affect runtime execution.
    }
  }
}

let singleton: MeshLiveRuntime | null = null;

export function getMeshLiveRuntime(): MeshLiveRuntime {
  singleton ??= new MeshLiveRuntime();
  return singleton;
}

export function resetMeshLiveRuntimeForTests(): void {
  singleton = null;
}
