"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshLiveRuntime = void 0;
exports.getMeshLiveRuntime = getMeshLiveRuntime;
exports.resetMeshLiveRuntimeForTests = resetMeshLiveRuntimeForTests;
const input_ingestor_1 = require("../sensory/input-ingestor");
const constants_1 = require("../brain/constants");
const constants_2 = require("../capabilities/constants");
const capability_mesh_orchestrator_1 = require("../capabilities/orchestration/capability-mesh-orchestrator");
const mesh_router_1 = require("../routing/mesh-router");
const session_lifecycle_manager_1 = require("../brain/session-lifecycle-manager");
const constants_3 = require("../experience/constants");
const cognitive_experience_capture_service_1 = require("../experience/services/cognitive-experience-capture-service");
const experience_retrieval_service_1 = require("../experience/services/experience-retrieval-service");
const in_memory_experience_repository_1 = require("../experience/repository/in-memory-experience-repository");
const negative_path_taxonomy_1 = require("../governance/negative-path-taxonomy");
const cat_experience_loop_1 = require("../memory/cat-experience-loop");
const cat_memory_adoption_service_1 = require("../memory/cat-memory-adoption-service");
const memory_adoption_service_1 = require("../memory/memory-adoption-service");
const motivated_recall_engine_1 = require("../memory/motivated-recall-engine");
const runtime_guard_1 = require("./runtime-guard");
const execution_ledger_1 = require("./execution-ledger");
const cognitive_signal_system_1 = require("./cognitive-signal-system");
const constitutional_evaluation_1 = require("../../governance/constitution/constitutional-evaluation");
function toSafeText(value) {
    if (typeof value === "string") {
        return value;
    }
    if (value == null) {
        return "";
    }
    try {
        return JSON.stringify(value);
    }
    catch {
        return String(value);
    }
}
class MeshLiveRuntime {
    constructor(ingestor = new input_ingestor_1.InputIngestor(), router = new mesh_router_1.MeshRouter(), options) {
        this.ingestor = ingestor;
        this.router = router;
        this.sessionSignals = new Map();
        this.brain = options?.brain;
        this.sessionLifecycleManager = options?.sessionLifecycleManager ?? new session_lifecycle_manager_1.SessionLifecycleManager();
        this.autoDestroyTerminalSessions = options?.autoDestroyTerminalSessions ?? false;
        this.capabilityOrchestrator = options?.capabilityOrchestrator ?? (0, capability_mesh_orchestrator_1.createDefaultCapabilityMeshOrchestrator)();
        this.capabilityFailureMode = options?.capabilityFailureMode ?? "fallback";
        this.experienceCaptureService =
            options?.experienceCaptureService ?? new cognitive_experience_capture_service_1.CognitiveExperienceCaptureService(new in_memory_experience_repository_1.InMemoryExperienceRepository());
        this.experienceRetrievalService =
            options?.experienceRetrievalService ??
                new experience_retrieval_service_1.ExperienceRetrievalService(this.experienceCaptureService.getRepository());
        this.cognitiveMemoryService = options?.cognitiveMemoryService;
        this.catMemoryAdoptionService =
            options?.catMemoryAdoptionService ??
                (this.cognitiveMemoryService
                    ? new cat_memory_adoption_service_1.CatMemoryAdoptionService(this.cognitiveMemoryService, {
                        experienceProvider: (sessionId, capabilityId, limit) => {
                            const sessionRecords = this.experienceRetrievalService
                                .getRecentExperiences(sessionId, Math.max(20, limit ?? 20))
                                .filter((record) => (capabilityId ? record.action.capabilityId === capabilityId : true));
                            if (sessionRecords.length > 0) {
                                return sessionRecords.slice(0, limit ?? 20);
                            }
                            if (!capabilityId) {
                                return [];
                            }
                            return this.experienceRetrievalService.getExperiencesByCapability(capabilityId, limit ?? 20);
                        },
                    })
                    : undefined);
        this.catExperienceLoop = this.cognitiveMemoryService ? new cat_experience_loop_1.CatExperienceLoop(this.cognitiveMemoryService) : undefined;
        this.memoryAdoptionService =
            options?.memoryAdoptionService ?? new memory_adoption_service_1.MemoryAdoptionService(this.cognitiveMemoryService);
        this.motivatedRecallEngine = options?.motivatedRecallEngine ?? new motivated_recall_engine_1.MotivatedRecallEngine();
        this.runtimeGuard = options?.runtimeGuard ?? new runtime_guard_1.RuntimeGuard();
        this.executionLedger = options?.executionLedger ?? (0, execution_ledger_1.getExecutionLedger)();
        this.constitutionalEvaluationHook = new constitutional_evaluation_1.ConstitutionalEvaluationHook();
    }
    async processWorkflowTrigger(input) {
        const init = this.initializeSessionForRequest(input.sessionId, input.routeType, input.rawInput, "workflow.trigger");
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
        let capabilityTrace = {
            capabilityStatus: "none",
            verificationInvoked: false,
            verificationRequired: false,
            verificationDisposition: "inconclusive",
            guardrailApplied: false,
            fallbackTriggered: false,
            governanceIssues: init.lifecycleViolation ? [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION] : [],
            cognitiveSignals: [],
            memoryAdoption: undefined,
            reinforcementAppliedCount: 0,
            reinforcementEvents: [],
            constitutionalEvaluation: undefined,
        };
        this.executionLedger.append({
            category: "execution",
            eventType: "execution.started",
            action: "process_workflow_trigger",
            source: "mesh_live_runtime",
            target: input.routeType,
            ids: {
                requestId: input.requestId,
                executionId: event.eventId,
                correlationId: input.requestId,
                sessionId: input.sessionId,
            },
            mode: "normal",
            status: "started",
            metadata: { sourceType: event.sourceType },
        });
        try {
            capabilityTrace = await this.invokeCapabilityMesh(sessionBrain, event, "workflow");
            await this.ingestBrain(event);
            sessionBrain.getCognitiveState().transitionIfNotTerminal("executing", {
                source: "mesh-live-runtime",
                reason: "route_dispatch_started",
            });
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_STARTED,
                label: "workflow_route_execution_started",
                source: "mesh-live-runtime",
                metadata: {
                    routeType: input.routeType,
                },
            });
            const guardedRoute = await (0, runtime_guard_1.executeWithRuntimeGuard)(this.runtimeGuard, {
                actionType: "workflow_side_effect",
                actor: "mesh_live_runtime",
                source: event.sourceType,
                target: event.routeType,
                requestedOperation: "route_dispatch",
                sensitivityHints: [...(event.tags ?? [])],
                riskHint: this.toRuntimeRiskHint(event.risk.score),
                safeMode: this.resolveSafeMode(input.metadata),
                policyFlags: this.resolveRuntimePolicyFlags(input.metadata),
                ids: {
                    correlationId: input.requestId,
                    executionId: event.eventId,
                    requestId: input.requestId,
                },
                protectedAction: true,
            }, {
                execute: () => this.router.route(event),
                onSafeModeRedirect: () => Promise.resolve(this.buildSafeModeRedirectResult(event, "workflow")),
            });
            const result = {
                ...guardedRoute.value,
                reasons: guardedRoute.decision.outcome === "allow" ||
                    guardedRoute.value.reasons.includes(`runtime_guard:${guardedRoute.decision.outcome}`)
                    ? guardedRoute.value.reasons
                    : [...guardedRoute.value.reasons, `runtime_guard:${guardedRoute.decision.outcome}`],
            };
            this.executionLedger.append({
                category: "runtime",
                eventType: "runtime.guard.evaluated",
                action: "route_dispatch",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: this.toLedgerMode(guardedRoute.decision.outcome),
                status: "evaluated",
                guard: { runtime: guardedRoute.decision },
            });
            if (guardedRoute.decision.outcome === "deny" ||
                guardedRoute.decision.outcome === "safe_mode_redirect" ||
                guardedRoute.decision.outcome === "degraded_allow") {
                capabilityTrace.guardrailApplied = true;
                capabilityTrace.governanceIssues = [...new Set([...capabilityTrace.governanceIssues, negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED])];
            }
            this.recordRouteOutcome(sessionBrain, result, "workflow");
            this.captureExperience(sessionBrain, event, result, capabilityTrace, "workflow", "completed", capabilityTrace.memoryExecution);
            this.finalizeSessionState(input.sessionId, "completed", {
                reason: "workflow_route_finished",
                source: "mesh-live-runtime",
            });
            this.executionLedger.append({
                category: "execution",
                eventType: result.accepted ? "execution.completed" : "execution.denied",
                action: "process_workflow_trigger",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: result.reasons.some((reason) => reason.includes("safe_mode_redirect")) ? "safe_mode_redirect" : "normal",
                status: result.accepted ? "completed" : "denied",
                metadata: {
                    disposition: result.disposition,
                    reasons: result.reasons,
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                    memoryAdoptionDecision: capabilityTrace.memoryAdoption?.decision,
                    memoryAdoptionQuality: capabilityTrace.memoryAdoption?.quality,
                    reinforcementAppliedCount: capabilityTrace.reinforcementAppliedCount ?? 0,
                    constitutionalStatus: capabilityTrace.constitutionalEvaluation?.constitutionalStatus,
                    constitutionalScore: capabilityTrace.constitutionalEvaluation?.constitutionalScore,
                    constitutionalReasonCodes: capabilityTrace.constitutionalEvaluation?.constitutionalReasonCodes,
                },
            });
            return result;
        }
        catch (error) {
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_FAILED,
                label: "workflow_route_execution_failed",
                source: "mesh-live-runtime",
                metadata: {
                    routeType: input.routeType,
                },
            });
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.ROUTE_ERROR,
                decision: "workflow_route_failed",
                rationale: error instanceof Error ? error.message : "unknown_error",
                source: "mesh-live-runtime",
            });
            if (!capabilityTrace.constitutionalEvaluation) {
                capabilityTrace = {
                    ...capabilityTrace,
                    constitutionalEvaluation: await this.constitutionalEvaluationHook.evaluate({
                        evaluatedEntityType: "runtime_execution",
                        evaluatedEntityId: event.eventId,
                        executionId: event.eventId,
                        sessionId: event.sessionId,
                        resultStatus: capabilityTrace.capabilityStatus,
                        fallbackTriggered: capabilityTrace.fallbackTriggered,
                        cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                        hasExperienceRecord: false,
                    }),
                };
            }
            this.captureExperience(sessionBrain, event, undefined, {
                ...capabilityTrace,
                fallbackTriggered: capabilityTrace.fallbackTriggered,
                governanceIssues: [
                    ...capabilityTrace.governanceIssues,
                    ...(this.capabilityFailureMode === "strict" ? [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.FALLBACK_EXHAUSTED] : []),
                ],
                error: error instanceof Error ? error.message : "unknown_error",
            }, "workflow", "failed", capabilityTrace.memoryExecution);
            this.finalizeSessionState(input.sessionId, "failed", {
                reason: "workflow_route_exception",
                source: "mesh-live-runtime",
            });
            this.executionLedger.append({
                category: "execution",
                eventType: "execution.failed",
                action: "process_workflow_trigger",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: "normal",
                status: "failed",
                metadata: {
                    error: error instanceof Error ? error.message : "unknown_error",
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                    memoryAdoptionDecision: capabilityTrace.memoryAdoption?.decision,
                    memoryAdoptionQuality: capabilityTrace.memoryAdoption?.quality,
                    reinforcementAppliedCount: capabilityTrace.reinforcementAppliedCount ?? 0,
                    constitutionalStatus: capabilityTrace.constitutionalEvaluation?.constitutionalStatus,
                    constitutionalScore: capabilityTrace.constitutionalEvaluation?.constitutionalScore,
                    constitutionalReasonCodes: capabilityTrace.constitutionalEvaluation?.constitutionalReasonCodes,
                },
            });
            if (error instanceof runtime_guard_1.RuntimeGuardDeniedError) {
                throw new Error(error.message);
            }
            throw error;
        }
    }
    async processChatUserRequest(input) {
        const init = this.initializeSessionForRequest(input.sessionId, input.routeType, input.rawInput, "chat.user_text");
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
        let capabilityTrace = {
            capabilityStatus: "none",
            verificationInvoked: false,
            verificationRequired: false,
            verificationDisposition: "inconclusive",
            guardrailApplied: false,
            fallbackTriggered: false,
            governanceIssues: init.lifecycleViolation ? [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION] : [],
            cognitiveSignals: [],
            memoryAdoption: undefined,
            reinforcementAppliedCount: 0,
            reinforcementEvents: [],
            constitutionalEvaluation: undefined,
        };
        this.executionLedger.append({
            category: "execution",
            eventType: "execution.started",
            action: "process_chat_user_request",
            source: "mesh_live_runtime",
            target: input.routeType,
            ids: {
                requestId: input.requestId,
                executionId: event.eventId,
                correlationId: input.requestId,
                sessionId: input.sessionId,
            },
            mode: "normal",
            status: "started",
            metadata: { sourceType: event.sourceType },
        });
        try {
            capabilityTrace = await this.invokeCapabilityMesh(sessionBrain, event, "chat");
            await this.ingestBrain(event);
            sessionBrain.getCognitiveState().transitionIfNotTerminal("executing", {
                source: "mesh-live-runtime",
                reason: "route_dispatch_started",
            });
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_STARTED,
                label: "chat_route_execution_started",
                source: "mesh-live-runtime",
                metadata: {
                    routeType: input.routeType,
                },
            });
            const guardedRoute = await (0, runtime_guard_1.executeWithRuntimeGuard)(this.runtimeGuard, {
                actionType: "workflow_side_effect",
                actor: "mesh_live_runtime",
                source: event.sourceType,
                target: event.routeType,
                requestedOperation: "route_dispatch",
                sensitivityHints: [...(event.tags ?? [])],
                riskHint: this.toRuntimeRiskHint(event.risk.score),
                safeMode: this.resolveSafeMode(input.metadata),
                policyFlags: this.resolveRuntimePolicyFlags(input.metadata),
                ids: {
                    correlationId: input.requestId,
                    executionId: event.eventId,
                    requestId: input.requestId,
                },
                protectedAction: true,
            }, {
                execute: () => this.router.route(event),
                onSafeModeRedirect: () => Promise.resolve(this.buildSafeModeRedirectResult(event, "chat")),
            });
            const result = {
                ...guardedRoute.value,
                reasons: guardedRoute.decision.outcome === "allow" ||
                    guardedRoute.value.reasons.includes(`runtime_guard:${guardedRoute.decision.outcome}`)
                    ? guardedRoute.value.reasons
                    : [...guardedRoute.value.reasons, `runtime_guard:${guardedRoute.decision.outcome}`],
            };
            this.executionLedger.append({
                category: "runtime",
                eventType: "runtime.guard.evaluated",
                action: "route_dispatch",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: this.toLedgerMode(guardedRoute.decision.outcome),
                status: "evaluated",
                guard: { runtime: guardedRoute.decision },
            });
            if (guardedRoute.decision.outcome === "deny" ||
                guardedRoute.decision.outcome === "safe_mode_redirect" ||
                guardedRoute.decision.outcome === "degraded_allow") {
                capabilityTrace.guardrailApplied = true;
                capabilityTrace.governanceIssues = [...new Set([...capabilityTrace.governanceIssues, negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED])];
            }
            this.recordRouteOutcome(sessionBrain, result, "chat");
            this.captureExperience(sessionBrain, event, result, capabilityTrace, "chat", "completed", capabilityTrace.memoryExecution);
            this.finalizeSessionState(input.sessionId, "completed", {
                reason: "chat_route_finished",
                source: "mesh-live-runtime",
            });
            this.executionLedger.append({
                category: "execution",
                eventType: result.accepted ? "execution.completed" : "execution.denied",
                action: "process_chat_user_request",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: result.reasons.some((reason) => reason.includes("safe_mode_redirect")) ? "safe_mode_redirect" : "normal",
                status: result.accepted ? "completed" : "denied",
                metadata: {
                    disposition: result.disposition,
                    reasons: result.reasons,
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                    memoryAdoptionDecision: capabilityTrace.memoryAdoption?.decision,
                    memoryAdoptionQuality: capabilityTrace.memoryAdoption?.quality,
                    reinforcementAppliedCount: capabilityTrace.reinforcementAppliedCount ?? 0,
                    constitutionalStatus: capabilityTrace.constitutionalEvaluation?.constitutionalStatus,
                    constitutionalScore: capabilityTrace.constitutionalEvaluation?.constitutionalScore,
                    constitutionalReasonCodes: capabilityTrace.constitutionalEvaluation?.constitutionalReasonCodes,
                },
            });
            return result;
        }
        catch (error) {
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_FAILED,
                label: "chat_route_execution_failed",
                source: "mesh-live-runtime",
                metadata: {
                    routeType: input.routeType,
                },
            });
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.ROUTE_ERROR,
                decision: "chat_route_failed",
                rationale: error instanceof Error ? error.message : "unknown_error",
                source: "mesh-live-runtime",
            });
            if (!capabilityTrace.constitutionalEvaluation) {
                capabilityTrace = {
                    ...capabilityTrace,
                    constitutionalEvaluation: await this.constitutionalEvaluationHook.evaluate({
                        evaluatedEntityType: "runtime_execution",
                        evaluatedEntityId: event.eventId,
                        executionId: event.eventId,
                        sessionId: event.sessionId,
                        resultStatus: capabilityTrace.capabilityStatus,
                        fallbackTriggered: capabilityTrace.fallbackTriggered,
                        cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                        hasExperienceRecord: false,
                    }),
                };
            }
            this.captureExperience(sessionBrain, event, undefined, {
                ...capabilityTrace,
                fallbackTriggered: capabilityTrace.fallbackTriggered,
                governanceIssues: [
                    ...capabilityTrace.governanceIssues,
                    ...(this.capabilityFailureMode === "strict" ? [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.FALLBACK_EXHAUSTED] : []),
                ],
                error: error instanceof Error ? error.message : "unknown_error",
            }, "chat", "failed", capabilityTrace.memoryExecution);
            this.finalizeSessionState(input.sessionId, "failed", {
                reason: "chat_route_exception",
                source: "mesh-live-runtime",
            });
            this.executionLedger.append({
                category: "execution",
                eventType: "execution.failed",
                action: "process_chat_user_request",
                source: "mesh_live_runtime",
                target: input.routeType,
                ids: {
                    requestId: input.requestId,
                    executionId: event.eventId,
                    correlationId: input.requestId,
                    sessionId: input.sessionId,
                },
                mode: "normal",
                status: "failed",
                metadata: {
                    error: error instanceof Error ? error.message : "unknown_error",
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                    memoryAdoptionDecision: capabilityTrace.memoryAdoption?.decision,
                    memoryAdoptionQuality: capabilityTrace.memoryAdoption?.quality,
                    reinforcementAppliedCount: capabilityTrace.reinforcementAppliedCount ?? 0,
                    constitutionalStatus: capabilityTrace.constitutionalEvaluation?.constitutionalStatus,
                    constitutionalScore: capabilityTrace.constitutionalEvaluation?.constitutionalScore,
                    constitutionalReasonCodes: capabilityTrace.constitutionalEvaluation?.constitutionalReasonCodes,
                },
            });
            if (error instanceof runtime_guard_1.RuntimeGuardDeniedError) {
                throw new Error(error.message);
            }
            throw error;
        }
    }
    getMetricsSnapshot() {
        return this.router.getMetricsSnapshot();
    }
    getRepositorySnapshot() {
        return this.router.getRepositorySnapshot();
    }
    incrementMetric(name) {
        this.router.incrementMetric(name);
    }
    getBrainQueueSnapshot() {
        return this.brain?.queueSnapshot();
    }
    getSessionBrainSnapshot(sessionId) {
        return this.sessionLifecycleManager.snapshot(sessionId);
    }
    destroySessionBrain(sessionId) {
        this.sessionSignals.delete(sessionId);
        return this.sessionLifecycleManager.destroySession(sessionId);
    }
    hasActiveSessionBrain(sessionId) {
        return this.sessionLifecycleManager.hasActiveSession(sessionId);
    }
    destroySessionBrainIfTerminal(sessionId) {
        const destroyed = this.sessionLifecycleManager.destroySessionIfTerminal(sessionId);
        if (destroyed) {
            this.sessionSignals.delete(sessionId);
        }
        return destroyed;
    }
    getSessionCognitiveSignals(sessionId, limit = 200) {
        const signals = this.sessionSignals.get(sessionId) ?? [];
        if (limit <= 0) {
            return [];
        }
        return signals.slice(-limit).map((signal) => ({
            ...signal,
            ids: { ...signal.ids },
            reasonCodes: [...signal.reasonCodes],
            metadata: signal.metadata ? { ...signal.metadata } : undefined,
        }));
    }
    getRecentExperiences(sessionId, limit = 20) {
        return this.experienceRetrievalService.getRecentExperiences(sessionId, limit);
    }
    getExperiencesByCapability(capabilityId, limit = 20) {
        return this.experienceRetrievalService.getExperiencesByCapability(capabilityId, limit);
    }
    getExperiencesByOutcome(classification, limit = 20) {
        return this.experienceRetrievalService.getExperiencesByOutcome(classification, limit);
    }
    getExperiencesByCircumstantialSignals(signals, limit = 20) {
        return this.experienceRetrievalService.findByCircumstantialSignals(signals, limit);
    }
    getCognitiveMemoryRepositorySnapshot() {
        return this.cognitiveMemoryService?.getRepository().snapshot();
    }
    getExecutionLedgerSnapshot() {
        return this.executionLedger.snapshot();
    }
    getCanonicalTimelineSnapshot() {
        return this.executionLedger.timelineSnapshot();
    }
    async ingestBrain(event) {
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
        }
        catch {
            // Brain ingestion is optional and must not affect core request routing.
        }
    }
    initializeSessionForRequest(sessionId, routeType, rawInput, sourceType) {
        const sessionBrain = this.sessionLifecycleManager.getOrCreateSession(sessionId);
        const transition = sessionBrain.getCognitiveState().transitionIfNotTerminal("understanding", {
            source: "mesh-live-runtime",
            reason: "request_received",
        });
        const lifecycleViolation = transition == null;
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_ROUTE_TYPE, routeType, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getReasoningContext().add({
            type: constants_1.REASONING_CONTEXT_TYPES.INPUT_RECEIVED,
            label: sourceType === "workflow.trigger" ? "workflow_input_received" : "chat_input_received",
            value: rawInput,
            source: "mesh-live-runtime",
            metadata: {
                routeType,
                sourceType,
            },
        });
        sessionBrain.getDecisionTrail().record({
            category: constants_1.DECISION_CATEGORIES.ROUTE_SELECTION,
            decision: routeType,
            source: "mesh-live-runtime",
            rationale: "runtime_entrypoint_selected_route_type",
        });
        if (lifecycleViolation) {
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.ROUTE_ERROR,
                decision: "lifecycle_violation_detected",
                source: "mesh-live-runtime",
                rationale: "attempted_initialize_on_terminal_session",
            });
        }
        if (this.cognitiveMemoryService) {
            this.cognitiveMemoryService.startSession({
                sessionId,
                sourceType: sourceType === "workflow.trigger" ? "workflow" : "chat",
                startedAt: new Date().toISOString(),
            });
            this.cognitiveMemoryService.captureConversationMessage({
                sessionId,
                role: "runtime",
                content: toSafeText(rawInput),
                source: sourceType,
                metadata: {
                    routeType,
                },
                tags: ["batch10:conversation_capture"],
            });
        }
        return { sessionBrain, lifecycleViolation };
    }
    recordRouteOutcome(sessionBrain, result, mode) {
        sessionBrain.getCognitiveState().transitionIfNotTerminal("evaluating", {
            source: "mesh-live-runtime",
            reason: "route_result_received",
        });
        sessionBrain.getReasoningContext().add({
            type: constants_1.REASONING_CONTEXT_TYPES.ROUTE_EXECUTION_COMPLETED,
            label: `${mode}_route_execution_completed`,
            source: "mesh-live-runtime",
            metadata: {
                accepted: result.accepted,
                disposition: result.disposition,
            },
        });
        sessionBrain.getDecisionTrail().record({
            category: constants_1.DECISION_CATEGORIES.ROUTE_OUTCOME,
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
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_ROUTE_DISPOSITION, result.disposition, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_SYNC_PLAN_ID, result.syncPlanId ?? null, {
            source: "mesh-live-runtime",
        });
    }
    finalizeSessionState(sessionId, outcome, options = {}) {
        this.sessionLifecycleManager.finalizeSession(sessionId, outcome, {
            reason: options.reason,
            source: options.source,
            destroyOnFinalize: this.autoDestroyTerminalSessions,
        });
    }
    readMetadataBoolean(metadata, key) {
        return metadata?.[key] === true;
    }
    resolveSafeMode(metadata) {
        const enabled = this.readMetadataBoolean(metadata, "safeMode") ||
            this.readMetadataBoolean(metadata, "safe_mode") ||
            this.readMetadataBoolean(metadata, "safeModeEnabled");
        return {
            enabled,
            source: enabled ? "metadata" : "default",
        };
    }
    resolveRuntimePolicyFlags(metadata) {
        return {
            explicitDeny: this.readMetadataBoolean(metadata, "runtimeGuardDeny"),
            allowInSafeMode: this.readMetadataBoolean(metadata, "allowInSafeMode"),
            allowDegradedInSafeMode: !this.readMetadataBoolean(metadata, "forceSafeModeRedirect"),
            forceDegraded: this.readMetadataBoolean(metadata, "runtimeGuardForceDegraded"),
            requireAudit: this.readMetadataBoolean(metadata, "runtimeGuardRequireAudit"),
            requireAuditForHighRisk: this.readMetadataBoolean(metadata, "runtimeGuardRequireAuditForHighRisk"),
        };
    }
    toRuntimeRiskHint(score) {
        if (score >= 0.85) {
            return "critical";
        }
        if (score >= 0.65) {
            return "high";
        }
        if (score >= 0.35) {
            return "medium";
        }
        return "low";
    }
    buildSafeModeRedirectResult(event, mode) {
        return {
            accepted: false,
            disposition: "restrict",
            trustClass: event.trustClass,
            riskScore: event.risk.score,
            firstResponseMs: 0,
            asyncJobIds: [],
            reasons: [`runtime_guard:safe_mode_redirect`, `${mode}_safe_mode_redirect`],
        };
    }
    buildGuardBlockedCapabilityOutcome(request, reason) {
        const completedAt = new Date().toISOString();
        const capabilityVerification = {
            decision: "policy_rejected",
            adoptable: false,
            reasonCodes: [],
            warnings: [],
            normalizedStatus: "blocked",
        };
        const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
            source: "mesh_live_runtime",
            ids: {
                requestId: request.requestId,
                sessionId: request.sessionId,
            },
            capabilityId: request.capabilityId,
            capabilityStatus: "blocked",
            capabilityVerification,
            runtimeGuardOutcome: reason,
            shouldCommit: false,
            governanceIssues: [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED],
        });
        return {
            capability: {
                capabilityId: request.capabilityId,
                name: "runtime-guard-blocked",
                family: "knowledge",
                version: "0.0.0",
                status: "suspended",
                description: "runtime guard blocked capability invocation",
                ownerAuthority: "runtime-guard",
                allowedOperations: [],
                verificationMode: "required",
                riskLevel: "high",
                directBrainCommitAllowed: false,
            },
            result: {
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                status: "blocked",
                errors: [`runtime_guard_${reason}`],
                verificationRequired: false,
                completedAt,
            },
            capabilityVerification: {
                ...capabilityVerification,
            },
            cognitiveSignals,
            verificationDisposition: "unavailable",
            governanceIssues: [negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED],
            invokable: false,
            directCommitAllowed: false,
            shouldCommit: false,
        };
    }
    toLedgerMode(outcome) {
        if (outcome === "reroute") {
            return "reroute";
        }
        if (outcome === "degraded_allow") {
            return "degraded";
        }
        if (outcome === "safe_mode_redirect") {
            return "safe_mode_redirect";
        }
        if (outcome === "require_audit") {
            return "audit_required";
        }
        return "normal";
    }
    async invokeCapabilityMesh(sessionBrain, event, mode) {
        const capabilityId = mode === "chat" ? constants_2.CAPABILITY_IDS.LANGUAGE : constants_2.CAPABILITY_IDS.RETRIEVAL;
        const motivatedRecall = this.evaluateMotivatedRecall(sessionBrain, event, capabilityId, mode);
        const memoryExecution = this.prepareCatMemoryExecution(event, capabilityId, mode, motivatedRecall);
        const memoryPacket = memoryExecution.packet;
        const request = {
            requestId: `cap-${event.eventId}`,
            sessionId: event.sessionId,
            capabilityId,
            purpose: mode === "chat" ? "normalize_user_request" : "retrieve_runtime_context",
            input: mode === "chat"
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
                memoryPacketId: memoryPacket?.packetId,
                memoryPacketItemCount: memoryPacket?.memoryItems.length,
                memoryPacketHints: memoryPacket?.memoryItems.slice(0, 2).map((item) => item.content),
                memoryInjectionStatus: memoryExecution.decision.status,
                memorySelectionReason: memoryExecution.trace.selectionReason,
                experienceReuseHint: memoryExecution.trace.experienceReuseDecision.hint,
                motivatedRecallMode: motivatedRecall.recallMode,
                motivatedRecallScore: motivatedRecall.score,
                memorySelectedIds: [...memoryExecution.trace.selectedMemoryIds],
            },
            createdAt: new Date().toISOString(),
        };
        this.recordMotivatedRecall(sessionBrain, motivatedRecall);
        this.recordMemorySelection(sessionBrain, memoryExecution);
        sessionBrain.getDecisionTrail().record({
            category: constants_1.DECISION_CATEGORIES.CAPABILITY_SELECTION,
            decision: capabilityId,
            source: "mesh-live-runtime",
            rationale: `capability_selected_for_${mode}_flow`,
        });
        try {
            const guardedCapability = await (0, runtime_guard_1.executeWithRuntimeGuard)(this.runtimeGuard, {
                actionType: "cognitive_mesh_execution",
                actor: "mesh_live_runtime",
                source: event.sourceType,
                target: capabilityId,
                requestedOperation: request.purpose,
                sensitivityHints: [mode, event.routeType ?? "unknown_route"],
                riskHint: this.toRuntimeRiskHint(event.risk.score),
                safeMode: this.resolveSafeMode(event.metadata),
                policyFlags: this.resolveRuntimePolicyFlags(event.metadata),
                ids: {
                    correlationId: event.requestId,
                    executionId: event.eventId,
                    requestId: request.requestId,
                },
                protectedAction: true,
            }, {
                execute: () => this.capabilityOrchestrator.invoke(request),
                onSafeModeRedirect: () => Promise.resolve(this.buildGuardBlockedCapabilityOutcome(request, "safe_mode_redirect")),
            });
            const outcome = guardedCapability.value;
            const runtimeGuardBlocked = guardedCapability.decision.outcome === "deny" || guardedCapability.decision.outcome === "safe_mode_redirect";
            const capabilityExecutionFailed = outcome.result.status === "failed";
            const capabilityAdoptionRejected = (outcome.result.status === "success" || outcome.result.status === "degraded_success") &&
                !outcome.capabilityVerification.adoptable;
            const capabilityFailureReason = outcome.result.errors?.find((item) => typeof item === "string" &&
                item.trim().length > 0 &&
                item !== "capability_execution_exception" &&
                item !== "capability_dispatch_failure" &&
                item !== "capability_execution_timeout") ??
                outcome.result.errors?.find((item) => typeof item === "string" && item.trim().length > 0) ??
                "capability_execution_failed";
            const verificationRejectionReason = capabilityAdoptionRejected
                ? `capability_verification_rejected:${outcome.capabilityVerification.decision}`
                : undefined;
            const signalCollector = new cognitive_signal_system_1.RuntimeSignalCollector();
            signalCollector.addMany(outcome.cognitiveSignals);
            signalCollector.addMany((0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "mesh_live_runtime",
                ids: {
                    requestId: request.requestId,
                    executionId: event.eventId,
                    correlationId: event.requestId,
                    sessionId: event.sessionId,
                },
                capabilityId: outcome.capability.capabilityId,
                routeType: event.routeType,
                capabilityStatus: outcome.result.status,
                capabilityVerification: outcome.capabilityVerification,
                runtimeGuardOutcome: guardedCapability.decision.outcome,
                shouldCommit: outcome.shouldCommit,
                fallbackTriggered: (capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "fallback",
                verificationRequired: outcome.result.verificationRequired || Boolean(outcome.verification),
                governanceIssues: outcome.governanceIssues,
                confidence: outcome.verification?.confidence ?? outcome.result.confidence,
            }));
            const cognitiveSignals = signalCollector.list();
            this.recordSessionSignals(event.sessionId, cognitiveSignals);
            const memoryAdoption = this.memoryAdoptionService.evaluateCapabilityCandidate({
                sessionId: event.sessionId,
                requestId: request.requestId,
                executionId: event.eventId,
                correlationId: event.requestId,
                routeType: event.routeType,
                capabilityId: outcome.capability.capabilityId,
                source: "mesh_live_runtime",
                resultStatus: outcome.result.status,
                payload: outcome.result.payload,
                confidence: outcome.verification?.confidence ?? outcome.result.confidence,
                capabilityVerification: outcome.capabilityVerification,
                directCommitEligible: outcome.shouldCommit,
                fallbackTriggered: (capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "fallback",
                cognitiveSignals,
                metadata: {
                    verificationDisposition: outcome.verificationDisposition,
                    runtimeGuardOutcome: guardedCapability.decision.outcome,
                    governanceIssues: [...outcome.governanceIssues],
                },
            });
            const reinforcement = this.applyMemoryReinforcement({
                adoptedMemoryId: memoryAdoption.memoryRecord?.memoryId,
                recalledMemoryIds: memoryExecution.trace.selectedMemoryIds,
                resultStatus: outcome.result.status,
                verificationDecision: outcome.capabilityVerification.decision,
                verificationAdoptable: outcome.capabilityVerification.adoptable,
                fallbackTriggered: (capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "fallback",
                cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(cognitiveSignals),
                memoryAdoptionDecision: memoryAdoption.decision,
            });
            const reinforcementAppliedCount = reinforcement.appliedCount;
            const reinforcementEvents = reinforcement.events;
            const constitutionalEvaluation = await this.constitutionalEvaluationHook.evaluate({
                evaluatedEntityType: "runtime_execution",
                evaluatedEntityId: event.eventId,
                executionId: event.eventId,
                sessionId: event.sessionId,
                resultStatus: outcome.result.status,
                verificationDecision: outcome.capabilityVerification.decision,
                runtimeGuardOutcome: guardedCapability.decision.outcome,
                dispatchGuardOutcome: undefined,
                fallbackTriggered: (capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "fallback",
                cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(cognitiveSignals),
                memoryAdoptionDecision: memoryAdoption.decision,
                reinforcementAppliedCount,
                hasExperienceRecord: true,
            });
            if ((capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "strict") {
                throw new Error(capabilityAdoptionRejected ? verificationRejectionReason ?? capabilityFailureReason : capabilityFailureReason);
            }
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED,
                label: `${mode}_capability_invoked`,
                source: "mesh-live-runtime",
                metadata: {
                    capabilityId: outcome.capability.capabilityId,
                    resultStatus: outcome.result.status,
                    invokable: outcome.invokable,
                    shouldCommit: outcome.shouldCommit,
                    verificationDisposition: outcome.verificationDisposition,
                    capabilityVerificationDecision: outcome.capabilityVerification.decision,
                    capabilityVerificationAdoptable: outcome.capabilityVerification.adoptable,
                    governanceIssues: outcome.governanceIssues,
                    runtimeGuardOutcome: guardedCapability.decision.outcome,
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(cognitiveSignals),
                    memoryAdoptionDecision: memoryAdoption.decision,
                    memoryAdoptionQuality: memoryAdoption.quality,
                    memoryAdoptionReasonCodes: memoryAdoption.reasonCodes,
                    reinforcementAppliedCount,
                    reinforcementEvents,
                    constitutionalStatus: constitutionalEvaluation.constitutionalStatus,
                    constitutionalScore: constitutionalEvaluation.constitutionalScore,
                    constitutionalReasonCodes: constitutionalEvaluation.constitutionalReasonCodes,
                },
            });
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.CAPABILITY_OUTCOME,
                decision: outcome.result.status,
                source: "mesh-live-runtime",
                metadata: {
                    capabilityId: outcome.capability.capabilityId,
                    verificationRequired: outcome.result.verificationRequired,
                    verificationDisposition: outcome.verificationDisposition,
                    capabilityVerificationDecision: outcome.capabilityVerification.decision,
                    capabilityVerificationAdoptable: outcome.capabilityVerification.adoptable,
                    governanceIssues: outcome.governanceIssues,
                    runtimeGuardOutcome: guardedCapability.decision.outcome,
                    cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(cognitiveSignals),
                    memoryAdoptionDecision: memoryAdoption.decision,
                    memoryAdoptionQuality: memoryAdoption.quality,
                    memoryAdoptionReasonCodes: memoryAdoption.reasonCodes,
                    reinforcementAppliedCount,
                    reinforcementEvents,
                    constitutionalStatus: constitutionalEvaluation.constitutionalStatus,
                    constitutionalScore: constitutionalEvaluation.constitutionalScore,
                    constitutionalReasonCodes: constitutionalEvaluation.constitutionalReasonCodes,
                },
            });
            if (outcome.verification) {
                sessionBrain.getReasoningContext().add({
                    type: constants_1.REASONING_CONTEXT_TYPES.CAPABILITY_VERIFICATION,
                    label: `${mode}_capability_verification`,
                    source: "mesh-live-runtime",
                    metadata: {
                        capabilityId: outcome.capability.capabilityId,
                        verdict: outcome.verification.verdict,
                        confidence: outcome.verification.confidence,
                    },
                });
                sessionBrain.getDecisionTrail().record({
                    category: constants_1.DECISION_CATEGORIES.CAPABILITY_VERDICT,
                    decision: outcome.verification.verdict,
                    source: "mesh-live-runtime",
                    confidence: outcome.verification.confidence,
                });
            }
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_STATUS, memoryAdoption.decision, { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_QUALITY, memoryAdoption.quality, { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_REASON_CODES, [...memoryAdoption.reasonCodes], { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTED_RECORD_ID, memoryAdoption.memoryRecord?.memoryId ?? null, { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_REINFORCEMENT_COUNT, reinforcementAppliedCount, { source: "mesh-live-runtime" });
            if (memoryAdoption.writeToWorkingMemory && outcome.result.payload !== undefined) {
                sessionBrain.getWorkingMemory().set(`runtime.capability.${outcome.capability.capabilityId}.payload`, outcome.result.payload, { source: "mesh-live-runtime" });
            }
            return {
                capabilityId: outcome.capability.capabilityId,
                capabilityStatus: outcome.result.status,
                verificationInvoked: Boolean(outcome.verification),
                verificationRequired: outcome.result.verificationRequired || Boolean(outcome.verification),
                verificationDisposition: outcome.verificationDisposition,
                verificationVerdict: outcome.verification?.verdict,
                confidence: outcome.verification?.confidence ?? outcome.result.confidence,
                guardrailApplied: outcome.result.status === "blocked" ||
                    outcome.result.status === "denied" ||
                    outcome.result.status === "not_found" ||
                    outcome.result.status === "invalid" ||
                    outcome.result.status === "unavailable" ||
                    capabilityAdoptionRejected ||
                    outcome.invokable === false ||
                    runtimeGuardBlocked,
                fallbackTriggered: (capabilityExecutionFailed || capabilityAdoptionRejected) && this.capabilityFailureMode === "fallback",
                governanceIssues: runtimeGuardBlocked
                    ? [...new Set([...outcome.governanceIssues, negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED])]
                    : outcome.governanceIssues,
                memoryExecution,
                cognitiveSignals,
                memoryAdoption,
                reinforcementAppliedCount,
                reinforcementEvents,
                constitutionalEvaluation,
                error: capabilityExecutionFailed
                    ? capabilityFailureReason
                    : capabilityAdoptionRejected
                        ? verificationRejectionReason
                        : undefined,
            };
        }
        catch (error) {
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED,
                label: `${mode}_capability_invocation_failed`,
                source: "mesh-live-runtime",
                metadata: {
                    capabilityId,
                    error: error instanceof Error ? error.message : "unknown_error",
                },
            });
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.CAPABILITY_OUTCOME,
                decision: "capability_invocation_failed",
                rationale: error instanceof Error ? error.message : "unknown_error",
                source: "mesh-live-runtime",
            });
            if (this.capabilityFailureMode === "strict") {
                throw error;
            }
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "mesh_live_runtime",
                ids: {
                    requestId: request.requestId,
                    executionId: event.eventId,
                    correlationId: event.requestId,
                    sessionId: event.sessionId,
                },
                capabilityId,
                routeType: event.routeType,
                capabilityStatus: "invocation_failed",
                shouldCommit: false,
                fallbackTriggered: true,
                governanceIssues: [],
            });
            this.recordSessionSignals(event.sessionId, cognitiveSignals);
            const constitutionalEvaluation = await this.constitutionalEvaluationHook.evaluate({
                evaluatedEntityType: "runtime_execution",
                evaluatedEntityId: event.eventId,
                executionId: event.eventId,
                sessionId: event.sessionId,
                resultStatus: "invocation_failed",
                fallbackTriggered: true,
                cognitiveSignalTypes: (0, cognitive_signal_system_1.summarizeSignalTypes)(cognitiveSignals),
                hasExperienceRecord: false,
            });
            return {
                capabilityId,
                capabilityStatus: "invocation_failed",
                verificationInvoked: false,
                verificationRequired: false,
                verificationDisposition: "unavailable",
                guardrailApplied: false,
                fallbackTriggered: true,
                governanceIssues: [],
                memoryExecution,
                cognitiveSignals,
                memoryAdoption: undefined,
                reinforcementAppliedCount: 0,
                reinforcementEvents: [],
                constitutionalEvaluation,
                error: error instanceof Error ? error.message : "unknown_error",
            };
        }
    }
    prepareCatMemoryExecution(event, capabilityId, mode, motivatedRecall) {
        if (!this.catMemoryAdoptionService || !this.cognitiveMemoryService) {
            return {
                decision: {
                    injected: false,
                    status: "disabled",
                    reason: "memory_adoption_unavailable",
                    relevanceFloor: 1,
                    packetItemCount: 0,
                },
                trace: {
                    explicitRecallCount: 0,
                    implicitRecallCount: 0,
                    selectedMemoryIds: [],
                    selectionReason: "memory_adoption_unavailable",
                    experienceReuseDecision: {
                        influenced: false,
                        signalScore: 0,
                        hint: "insufficient_evidence",
                        basis: "service_not_configured",
                    },
                },
            };
        }
        return this.catMemoryAdoptionService.prepare({
            event,
            capabilityId,
            purpose: `capability_injection:${capabilityId}`,
            sourceType: event.sourceType,
            routeType: event.routeType,
            riskScore: event.risk.score,
            enabled: mode === "chat" || mode === "workflow",
            motivatedRecall,
        });
    }
    evaluateMotivatedRecall(sessionBrain, event, capabilityId, mode) {
        const signals = this.buildMotivatedSignals(sessionBrain, event, capabilityId, mode);
        return this.motivatedRecallEngine.decide({
            sessionId: event.sessionId,
            capabilityId,
            routeType: event.routeType,
            sourceType: event.sourceType,
            signals,
        });
    }
    buildMotivatedSignals(sessionBrain, event, capabilityId, mode) {
        const normalized = event.normalizedInput.toLowerCase();
        const recentExperiences = this.experienceRetrievalService
            .getRecentExperiences(event.sessionId, 20)
            .filter((item) => item.action.capabilityId === capabilityId);
        const positives = recentExperiences.filter((item) => item.outcome.status === "positive").length;
        const negatives = recentExperiences.filter((item) => item.outcome.status === "negative").length;
        const priorExperienceUsefulness = recentExperiences.length === 0 ? 0 : Math.max(0, Math.min(1, (positives - negatives + recentExperiences.length) / (2 * recentExperiences.length)));
        const repetitionIndicator = recentExperiences.length >= 2 ? 0.8 : recentExperiences.length > 0 ? 0.45 : 0.2;
        const routeType = event.routeType?.toLowerCase() ?? "";
        const goalRelevance = (normalized.length > 0 && routeType.length > 0 && normalized.includes(routeType.split("/").filter(Boolean).pop() ?? "")) ||
            normalized.includes("status") ||
            normalized.includes("verify")
            ? 0.75
            : 0.4;
        const memoryItems = this.cognitiveMemoryService?.listMemoryBySession(event.sessionId) ?? [];
        const unresolvedContextRelevance = memoryItems.some((item) => item.layer === "unresolved") ? 0.7 : 0.2;
        const experienceLayerMatch = memoryItems.some((item) => item.tags.some((tag) => tag.key === "capability_id" && tag.value === capabilityId))
            ? 0.72
            : 0.35;
        const learnerOutputRelevance = event.sourceType === "chat.user_text" ? 0.62 : 0.4;
        const analysisResultRelevance = normalized.includes("anomaly") || normalized.includes("conflict") || normalized.includes("pattern") ? 0.7 : 0.35;
        const catHelpSignal = recentExperiences.some((item) => item.circumstances.fallbackTriggered) || normalized.includes("help") ? 0.68 : 0.28;
        const repairRequirementSignal = recentExperiences.some((item) => item.outcome.classification === "failed" || item.outcome.classification === "guarded")
            ? 0.74
            : 0.2;
        const creativeNeedSignal = recentExperiences.length === 0 && mode === "chat" ? 0.58 : 0.24;
        const dreamMemoryRelevance = memoryItems.some((item) => item.layer === "dream") ? 0.51 : 0.05;
        return {
            goalRelevance,
            riskIndicator: Math.max(0, Math.min(1, event.risk.score)),
            repetitionIndicator,
            unresolvedContextRelevance,
            priorExperienceUsefulness,
            experienceLayerMatch,
            learnerOutputRelevance,
            analysisResultRelevance,
            catHelpSignal,
            repairRequirementSignal,
            creativeNeedSignal,
            dreamMemoryRelevance,
        };
    }
    recordMotivatedRecall(sessionBrain, decision) {
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_MODE, decision.recallMode, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MOTIVATED_RECALL_SCORE, decision.score, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getReasoningContext().add({
            type: constants_1.REASONING_CONTEXT_TYPES.MOTIVATED_RECALL,
            label: "runtime_motivated_recall_evaluated",
            source: "mesh-live-runtime",
            metadata: {
                enableRecall: decision.enableRecall,
                recallMode: decision.recallMode,
                score: decision.score,
                confidence: decision.confidence,
                reasons: [...decision.reasons],
                signalsTriggered: [...decision.signalsTriggered],
            },
        });
        sessionBrain.getDecisionTrail().record({
            category: constants_1.DECISION_CATEGORIES.MOTIVATED_RECALL,
            decision: decision.recallMode,
            source: "mesh-live-runtime",
            confidence: decision.confidence,
            rationale: decision.reasons.join(","),
            metadata: {
                enableRecall: decision.enableRecall,
                score: decision.score,
                signalsTriggered: [...decision.signalsTriggered],
            },
        });
    }
    recordMemorySelection(sessionBrain, memoryExecution) {
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_INJECTION_STATUS, memoryExecution.decision.status, { source: "mesh-live-runtime" });
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_PACKET_ID, memoryExecution.packet?.packetId ?? null, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_SELECTION_REASON, memoryExecution.trace.selectionReason, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_MEMORY_REUSE_HINT, memoryExecution.trace.experienceReuseDecision.hint, {
            source: "mesh-live-runtime",
        });
        sessionBrain.getReasoningContext().add({
            type: constants_1.REASONING_CONTEXT_TYPES.MEMORY_INJECTION,
            label: "runtime_memory_injection_evaluated",
            source: "mesh-live-runtime",
            metadata: {
                status: memoryExecution.decision.status,
                packetId: memoryExecution.packet?.packetId,
                packetItemCount: memoryExecution.decision.packetItemCount,
                selectionReason: memoryExecution.trace.selectionReason,
                experienceReuseHint: memoryExecution.trace.experienceReuseDecision.hint,
            },
        });
        sessionBrain.getDecisionTrail().record({
            category: constants_1.DECISION_CATEGORIES.MEMORY_SELECTION,
            decision: memoryExecution.decision.status,
            source: "mesh-live-runtime",
            confidence: memoryExecution.trace.experienceReuseDecision.signalScore,
            rationale: memoryExecution.trace.selectionReason,
            metadata: {
                packetId: memoryExecution.packet?.packetId,
                selectedMemoryIds: [...memoryExecution.trace.selectedMemoryIds],
            },
        });
    }
    captureExperience(sessionBrain, event, result, capabilityTrace, mode, terminalState, memoryExecution) {
        try {
            const routeFallbackUsed = capabilityTrace.fallbackTriggered ||
                Boolean(result?.reasons.includes("mesh_router_failure_isolated")) ||
                (result?.accepted === false && result?.disposition === "restrict");
            const capture = this.experienceCaptureService.captureExecutionExperience({
                sessionId: event.sessionId,
                timestamp: new Date().toISOString(),
                source: {
                    component: constants_3.EXPERIENCE_SOURCE_COMPONENT,
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
                    notes: [
                        ...(capabilityTrace.error ? [capabilityTrace.error] : []),
                        ...(capabilityTrace.memoryAdoption
                            ? [`memory_adoption:${capabilityTrace.memoryAdoption.decision}`]
                            : []),
                    ],
                },
                circumstances: {
                    fallbackTriggered: routeFallbackUsed,
                    guardrailApplied: capabilityTrace.guardrailApplied ||
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
                relatedSignals: (0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals),
                relatedMemoryId: capabilityTrace.memoryAdoption?.memoryRecord?.memoryId,
                relatedExecutionId: event.eventId,
                relatedReinforcementEvents: capabilityTrace.reinforcementEvents ?? [],
                routeError: terminalState === "failed" ? capabilityTrace.error : undefined,
                routeFallbackUsed,
                executionAborted: false,
                governanceIssues: [...new Set(capabilityTrace.governanceIssues)],
                tags: [
                    `mode:${mode}`,
                    `route:${event.routeType ?? "unknown"}`,
                    `trust:${result?.trustClass ?? event.trustClass}`,
                    ...(capabilityTrace.memoryAdoption
                        ? [
                            `memory_adoption:${capabilityTrace.memoryAdoption.decision}`,
                            `memory_quality:${capabilityTrace.memoryAdoption.quality}`,
                        ]
                        : []),
                    ...(0, cognitive_signal_system_1.summarizeSignalTypes)(capabilityTrace.cognitiveSignals).map((signalType) => `signal:${signalType}`),
                ],
                experienceMetadata: {
                    memoryAdoptionDecision: capabilityTrace.memoryAdoption?.decision,
                    memoryAdoptionQuality: capabilityTrace.memoryAdoption?.quality,
                    reinforcementAppliedCount: capabilityTrace.reinforcementAppliedCount ?? 0,
                    constitutionalEvaluation: capabilityTrace.constitutionalEvaluation
                        ? {
                            evaluationId: capabilityTrace.constitutionalEvaluation.evaluationId,
                            constitutionalStatus: capabilityTrace.constitutionalEvaluation.constitutionalStatus,
                            constitutionalScore: capabilityTrace.constitutionalEvaluation.constitutionalScore,
                            constitutionalReasonCodes: capabilityTrace.constitutionalEvaluation.constitutionalReasonCodes,
                        }
                        : undefined,
                    terminalState,
                    routeDisposition: result?.disposition,
                    routeAccepted: result?.accepted,
                },
            });
            if (this.cognitiveMemoryService &&
                this.catExperienceLoop &&
                this.catMemoryAdoptionService &&
                capabilityTrace.capabilityId &&
                memoryExecution) {
                const outcomeSummary = this.catMemoryAdoptionService.summarizeOutcome({
                    execution: memoryExecution,
                    capabilityId: capabilityTrace.capabilityId,
                    capabilityStatus: capabilityTrace.capabilityStatus,
                    verificationDisposition: capabilityTrace.verificationDisposition,
                    accepted: result?.accepted,
                });
                this.catExperienceLoop.apply({
                    eventId: event.eventId,
                    sessionId: event.sessionId,
                    capabilityId: capabilityTrace.capabilityId,
                    learnerInput: event.normalizedInput,
                    guardrailsApplied: capabilityTrace.guardrailApplied ? ["guardrail_applied"] : [],
                    execution: memoryExecution,
                    actionSummary: `capability_status:${capabilityTrace.capabilityStatus}`,
                    confidence: capture.record.verification.confidence ?? capture.record.relevanceScore,
                    outcomeSummary,
                }, capture.record);
            }
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_STATUS, capture.captured ? "captured" : "skipped", { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_ERROR, null, {
                source: "mesh-live-runtime",
            });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_ID, capture.captured ? capture.record.experienceId : null, { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_OUTCOME, capture.captured ? capture.record.outcome.classification : null, { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set("runtime.last_constitutional_status", capabilityTrace.constitutionalEvaluation?.constitutionalStatus ?? "insufficient_data", { source: "mesh-live-runtime" });
            sessionBrain.getWorkingMemory().set("runtime.last_constitutional_score", capabilityTrace.constitutionalEvaluation?.constitutionalScore ?? 0.5, { source: "mesh-live-runtime" });
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.EXPERIENCE_CAPTURED,
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
                category: constants_1.DECISION_CATEGORIES.EXPERIENCE_CAPTURE,
                decision: capture.captured ? capture.record.outcome.classification : "skipped",
                confidence: capture.record.relevanceScore,
                source: "mesh-live-runtime",
                metadata: {
                    experienceId: capture.record.experienceId,
                    isMeaningful: capture.record.isMeaningful,
                    captured: capture.captured,
                },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "capture_failed";
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_STATUS, "failed", {
                source: "mesh-live-runtime",
            });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_CAPTURE_ERROR, `${negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.RUNTIME_CAPTURE_FAILED}:${errorMessage}`, {
                source: "mesh-live-runtime",
            });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_ID, null, {
                source: "mesh-live-runtime",
            });
            sessionBrain.getWorkingMemory().set(constants_1.WORKING_MEMORY_KEYS.LAST_EXPERIENCE_OUTCOME, null, {
                source: "mesh-live-runtime",
            });
            sessionBrain.getReasoningContext().add({
                type: constants_1.REASONING_CONTEXT_TYPES.EXPERIENCE_CAPTURED,
                label: `${mode}_experience_capture_failed`,
                source: "mesh-live-runtime",
                metadata: {
                    captured: false,
                    error: errorMessage,
                },
            });
            sessionBrain.getDecisionTrail().record({
                category: constants_1.DECISION_CATEGORIES.EXPERIENCE_CAPTURE,
                decision: "failed",
                source: "mesh-live-runtime",
                rationale: errorMessage,
            });
            // Experience capture must not affect runtime execution.
        }
    }
    applyMemoryReinforcement(input) {
        if (!this.cognitiveMemoryService) {
            return { appliedCount: 0, events: [] };
        }
        let applied = 0;
        const events = [];
        const reinforce = (memoryId, usedInRecall) => {
            const outcome = this.cognitiveMemoryService?.reinforceMemory({
                memoryId,
                resultStatus: input.resultStatus,
                verificationDecision: input.verificationDecision,
                verificationAdoptable: input.verificationAdoptable,
                fallbackTriggered: input.fallbackTriggered,
                cognitiveSignalTypes: input.cognitiveSignalTypes,
                usedInRecall,
                adoptedSuppressed: input.memoryAdoptionDecision === "suppressed" ||
                    input.memoryAdoptionDecision === "rejected" ||
                    input.memoryAdoptionDecision === "invalid_memory_candidate",
            });
            if (outcome) {
                applied += 1;
                events.push({
                    memoryId: outcome.state.memoryId,
                    delta: outcome.delta,
                    trend: outcome.state.reinforcementTrend,
                    reasonCodes: [...outcome.state.reinforcementReasonCodes],
                    timestamp: outcome.state.lastReinforcedTimestamp,
                });
            }
        };
        if (input.adoptedMemoryId) {
            reinforce(input.adoptedMemoryId, false);
        }
        for (const memoryId of [...new Set(input.recalledMemoryIds)]) {
            reinforce(memoryId, true);
        }
        return { appliedCount: applied, events };
    }
    recordSessionSignals(sessionId, signals) {
        if (signals.length === 0) {
            return;
        }
        const current = this.sessionSignals.get(sessionId) ?? [];
        const collector = new cognitive_signal_system_1.RuntimeSignalCollector();
        collector.addMany(current);
        collector.addMany(signals);
        const next = collector.list();
        if (next.length > 500) {
            this.sessionSignals.set(sessionId, next.slice(next.length - 500));
            return;
        }
        this.sessionSignals.set(sessionId, next);
    }
}
exports.MeshLiveRuntime = MeshLiveRuntime;
let singleton = null;
function getMeshLiveRuntime() {
    singleton ?? (singleton = new MeshLiveRuntime());
    return singleton;
}
function resetMeshLiveRuntimeForTests() {
    singleton = null;
}
