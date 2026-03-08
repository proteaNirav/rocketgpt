"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityMeshOrchestrator = void 0;
exports.createDefaultCapabilityMeshOrchestrator = createDefaultCapabilityMeshOrchestrator;
const constants_1 = require("../constants");
const capability_registry_1 = require("../registry/capability-registry");
const verification_capability_1 = require("../adaptors/verification-capability");
const language_capability_1 = require("../adaptors/language-capability");
const retrieval_capability_1 = require("../adaptors/retrieval-capability");
const capability_execution_hardener_1 = require("./capability-execution-hardener");
const capability_verification_1 = require("./capability-verification");
const negative_path_taxonomy_1 = require("../../governance/negative-path-taxonomy");
const runtime_guard_1 = require("../../runtime/runtime-guard");
const dispatch_guard_1 = require("../../runtime/dispatch-guard");
const execution_ledger_1 = require("../../runtime/execution-ledger");
const cognitive_signal_system_1 = require("../../runtime/cognitive-signal-system");
class CapabilityMeshOrchestrator {
    constructor(registry, adaptors = [], runtimeGuard = new runtime_guard_1.RuntimeGuard(), dispatchGuard = new dispatch_guard_1.DispatchGuard(), executionLedger = (0, execution_ledger_1.getExecutionLedger)()) {
        this.registry = registry;
        this.runtimeGuard = runtimeGuard;
        this.dispatchGuard = dispatchGuard;
        this.executionLedger = executionLedger;
        this.adaptors = new Map();
        this.invocationRecords = [];
        this.executionHardener = new capability_execution_hardener_1.CapabilityExecutionHardener();
        for (const adaptor of adaptors) {
            this.registerAdaptor(adaptor);
        }
    }
    registerAdaptor(adaptor) {
        const definition = adaptor.getCapabilityDefinition();
        this.registry.register(definition);
        this.adaptors.set(definition.capabilityId, adaptor);
    }
    getRegistry() {
        return this.registry;
    }
    listInvocationRecords(sessionId) {
        return this.invocationRecords
            .filter((record) => (sessionId ? record.sessionId === sessionId : true))
            .map((record) => ({ ...record }));
    }
    async invoke(request) {
        const selectedAt = new Date().toISOString();
        const governanceIssues = [];
        const normalizedRequest = this.executionHardener.normalizeRequest(request);
        request = normalizedRequest.request;
        if (!normalizedRequest.valid) {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
            const invalid = this.executionHardener.buildFailureResult({
                request,
                status: "invalid",
                failureClass: "invalid_request",
                reasonCodes: normalizedRequest.reasonCodes,
                stage: "input_normalized",
            });
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "capability_mesh_orchestrator",
                ids: {
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                },
                capabilityId: request.capabilityId,
                capabilityStatus: invalid.status,
                capabilityVerification: {
                    decision: "invalid_result",
                    adoptable: false,
                    reasonCodes: ["RESULT_CLASSIFICATION_MISSING"],
                    warnings: [],
                    normalizedStatus: invalid.status,
                },
                shouldCommit: false,
                governanceIssues,
            });
            return {
                capability: this.buildUnknownCapability(request.capabilityId, "invalid request"),
                result: invalid,
                capabilityVerification: {
                    decision: "invalid_result",
                    adoptable: false,
                    reasonCodes: ["RESULT_CLASSIFICATION_MISSING"],
                    warnings: [],
                    normalizedStatus: invalid.status,
                },
                cognitiveSignals,
                verificationDisposition: "unavailable",
                governanceIssues,
                invokable: false,
                directCommitAllowed: false,
                shouldCommit: false,
            };
        }
        const eligibility = this.executionHardener.evaluateEligibility(this.registry, this.adaptors, request);
        const capability = eligibility.capability;
        if (!eligibility.eligible || !capability) {
            if (eligibility.status === "not_found" || eligibility.status === "unavailable") {
                governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE);
            }
            if (eligibility.status === "denied" ||
                eligibility.status === "blocked" ||
                eligibility.failureClass === "capability_disabled" ||
                eligibility.failureClass === "operation_not_supported" ||
                eligibility.failureClass === "context_requirements_missing") {
                governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
            }
            const result = this.executionHardener.buildFailureResult({
                request,
                status: eligibility.status,
                failureClass: eligibility.failureClass ?? "capability_unavailable",
                reasonCodes: eligibility.reasonCodes,
                stage: "capability_eligibility_checked",
            });
            const capabilityVerification = {
                decision: eligibility.status === "denied" || eligibility.status === "blocked" ? "policy_rejected" : "rejected",
                adoptable: false,
                reasonCodes: [],
                warnings: [],
                normalizedStatus: result.status,
            };
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "capability_mesh_orchestrator",
                ids: {
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                },
                capabilityId: request.capabilityId,
                capabilityStatus: result.status,
                capabilityVerification,
                shouldCommit: false,
                governanceIssues,
            });
            return {
                capability: capability ?? this.buildUnknownCapability(request.capabilityId, "eligibility blocked"),
                result,
                capabilityVerification,
                cognitiveSignals,
                verificationDisposition: "unavailable",
                governanceIssues,
                invokable: false,
                directCommitAllowed: false,
                shouldCommit: false,
            };
        }
        const adaptor = this.adaptors.get(request.capabilityId);
        if (!adaptor) {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE);
            const unavailable = this.executionHardener.buildFailureResult({
                request,
                status: "unavailable",
                failureClass: "capability_unavailable",
                reasonCodes: ["capability_adaptor_missing"],
                stage: "capability_eligibility_checked",
            });
            const capabilityVerification = {
                decision: "rejected",
                adoptable: false,
                reasonCodes: [],
                warnings: [],
                normalizedStatus: unavailable.status,
            };
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "capability_mesh_orchestrator",
                ids: {
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                },
                capabilityId: request.capabilityId,
                capabilityStatus: unavailable.status,
                capabilityVerification,
                shouldCommit: false,
                governanceIssues,
            });
            return {
                capability,
                result: unavailable,
                capabilityVerification,
                cognitiveSignals,
                verificationDisposition: "unavailable",
                governanceIssues,
                invokable: false,
                directCommitAllowed: false,
                shouldCommit: false,
            };
        }
        const trace = request.trace ?? {};
        const traceString = (key) => {
            const value = trace[key];
            return typeof value === "string" && value.trim().length > 0 ? value : undefined;
        };
        const traceBoolean = (key) => trace[key] === true;
        const guardActionType = request.capabilityId === constants_1.CAPABILITY_IDS.RETRIEVAL ? "data_sensitive_operation" : "provider_tool_invocation";
        const guardDecision = this.runtimeGuard.evaluate({
            actionType: guardActionType,
            actor: "capability_mesh_orchestrator",
            source: traceString("sourceType"),
            target: request.capabilityId,
            requestedOperation: request.purpose,
            sensitivityHints: [capability.riskLevel, request.expectedOutputType].filter((hint) => typeof hint === "string" && hint.length > 0),
            riskHint: capability.riskLevel === "critical" ? "critical" : capability.riskLevel === "high" ? "high" : "medium",
            safeMode: traceBoolean("safeMode"),
            policyFlags: {
                explicitDeny: traceBoolean("runtimeGuardDeny"),
                allowInSafeMode: traceBoolean("allowInSafeMode"),
                forceDegraded: traceBoolean("runtimeGuardForceDegraded"),
                requireAudit: traceBoolean("runtimeGuardRequireAudit"),
            },
            ids: {
                correlationId: traceString("correlationId"),
                executionId: traceString("executionId"),
                requestId: request.requestId,
            },
            protectedAction: true,
        });
        this.executionLedger.append({
            category: "runtime",
            eventType: "runtime.guard.evaluated",
            action: request.purpose,
            source: "capability_mesh_orchestrator",
            target: request.capabilityId,
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            mode: this.toLedgerMode(guardDecision.outcome),
            status: "evaluated",
            guard: { runtime: guardDecision },
        });
        if (guardDecision.outcome === "deny" || guardDecision.outcome === "safe_mode_redirect") {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
            const blockedByGuard = this.executionHardener.buildFailureResult({
                request,
                status: "denied",
                failureClass: "guard_blocked",
                reasonCodes: [`runtime_guard_blocked:${guardDecision.reasons.map((reason) => reason.code).join(",")}`],
                stage: "policy_gated",
            });
            this.recordInvocation({
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                selectedAt,
                completedAt: blockedByGuard.completedAt,
                resultStatus: blockedByGuard.status,
                verificationInvoked: false,
            });
            const capabilityVerification = {
                decision: "policy_rejected",
                adoptable: false,
                reasonCodes: [],
                warnings: [],
                normalizedStatus: blockedByGuard.status,
            };
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "capability_mesh_orchestrator",
                ids: {
                    requestId: request.requestId,
                    executionId: traceString("executionId"),
                    correlationId: traceString("correlationId"),
                    sessionId: request.sessionId,
                },
                capabilityId: request.capabilityId,
                capabilityStatus: blockedByGuard.status,
                capabilityVerification,
                runtimeGuardOutcome: guardDecision.outcome,
                shouldCommit: false,
                governanceIssues,
            });
            return {
                capability,
                result: blockedByGuard,
                capabilityVerification,
                cognitiveSignals,
                verificationDisposition: "unavailable",
                governanceIssues,
                invokable: false,
                directCommitAllowed: false,
                shouldCommit: false,
            };
        }
        let dispatchAuditRequired = false;
        let dispatchDegraded = false;
        let guardedDispatch;
        try {
            guardedDispatch = await (0, dispatch_guard_1.executeWithDispatchGuard)(this.dispatchGuard, {
                category: "capability_dispatch",
                source: "capability_mesh_orchestrator",
                sourceType: traceString("sourceType"),
                target: request.capabilityId,
                targetKind: "internal",
                route: "capability_adapter",
                mode: "sync",
                targetTrustHint: capability.status === "suspended"
                    ? "blocked"
                    : capability.status === "restricted"
                        ? "restricted"
                        : capability.status === "retired"
                            ? "quarantined"
                            : "trusted",
                targetHealthHint: capability.status === "active" ? "healthy" : "degraded",
                sensitivityHints: [capability.riskLevel, request.expectedOutputType].filter((hint) => typeof hint === "string" && hint.length > 0),
                safeMode: traceBoolean("safeMode"),
                policyFlags: {
                    explicitDeny: traceBoolean("dispatchGuardDeny"),
                    forceDegraded: traceBoolean("dispatchGuardForceDegraded"),
                    requireAudit: traceBoolean("dispatchGuardRequireAudit"),
                    safeModeRedirect: true,
                    forceRerouteTo: (() => {
                        const rerouteTarget = traceString("dispatchGuardRerouteCapabilityId");
                        return rerouteTarget ? { target: rerouteTarget, mode: "sync" } : undefined;
                    })(),
                },
                ids: {
                    correlationId: traceString("correlationId"),
                    executionId: traceString("executionId"),
                    requestId: request.requestId,
                },
                protectedDispatch: true,
            }, {
                execute: async () => {
                    try {
                        return await adaptor.invoke(request);
                    }
                    catch (error) {
                        const classified = this.executionHardener.classifyExecutionError(error);
                        return this.executionHardener.buildFailureResult({
                            request,
                            status: classified.status,
                            failureClass: classified.failureClass,
                            reasonCodes: classified.reasonCodes,
                            stage: "execution_failed",
                        });
                    }
                },
                onSafeModeRedirect: () => Promise.resolve(this.executionHardener.buildFailureResult({
                    request,
                    status: "denied",
                    failureClass: "guard_blocked",
                    reasonCodes: ["dispatch_guard_safe_mode_redirect"],
                    stage: "policy_gated",
                })),
                onReroute: async (decision) => {
                    const rerouteTarget = decision.reroute?.target;
                    if (!rerouteTarget || rerouteTarget === request.capabilityId) {
                        return this.executionHardener.buildFailureResult({
                            request,
                            status: "invalid",
                            failureClass: "invalid_request",
                            reasonCodes: ["dispatch_guard_reroute_missing_target"],
                            stage: "policy_gated",
                        });
                    }
                    if (!this.registry.isInvokable(rerouteTarget)) {
                        return this.executionHardener.buildFailureResult({
                            request,
                            status: "unavailable",
                            failureClass: "capability_disabled",
                            reasonCodes: [`dispatch_guard_reroute_target_not_invokable:${rerouteTarget}`],
                            stage: "policy_gated",
                        });
                    }
                    const rerouteAdaptor = this.adaptors.get(rerouteTarget);
                    if (!rerouteAdaptor) {
                        return this.executionHardener.buildFailureResult({
                            request,
                            status: "unavailable",
                            failureClass: "capability_unavailable",
                            reasonCodes: [`dispatch_guard_reroute_adaptor_missing:${rerouteTarget}`],
                            stage: "policy_gated",
                        });
                    }
                    try {
                        const rerouteRaw = await rerouteAdaptor.invoke({
                            ...request,
                            capabilityId: rerouteTarget,
                            purpose: `${request.purpose}:dispatch_guard_reroute`,
                        });
                        return this.executionHardener.normalizeResult({
                            request,
                            rawResult: rerouteRaw,
                            stage: "result_normalized",
                            reasonCodes: ["dispatch_guard_reroute"],
                        });
                    }
                    catch (error) {
                        const classified = this.executionHardener.classifyExecutionError(error);
                        return this.executionHardener.buildFailureResult({
                            request,
                            status: classified.status,
                            failureClass: classified.failureClass,
                            reasonCodes: [...classified.reasonCodes, `dispatch_guard_reroute_target:${rerouteTarget}`],
                            stage: "execution_failed",
                        });
                    }
                },
                onRequireAudit: () => {
                    dispatchAuditRequired = true;
                    return Promise.resolve();
                },
                onDegradedAllow: () => {
                    dispatchDegraded = true;
                    return Promise.resolve();
                },
            });
            this.executionLedger.append({
                category: "dispatch",
                eventType: "dispatch.guard.evaluated",
                action: request.purpose,
                source: "capability_mesh_orchestrator",
                target: request.capabilityId,
                ids: {
                    requestId: request.requestId,
                    executionId: traceString("executionId"),
                    correlationId: traceString("correlationId"),
                    sessionId: request.sessionId,
                },
                mode: this.toLedgerMode(guardedDispatch.decision.outcome),
                status: "evaluated",
                guard: { dispatch: guardedDispatch.decision },
            });
        }
        catch (error) {
            if (error instanceof dispatch_guard_1.DispatchGuardDeniedError) {
                this.executionLedger.append({
                    category: "dispatch",
                    eventType: "dispatch.denied",
                    action: request.purpose,
                    source: "capability_mesh_orchestrator",
                    target: request.capabilityId,
                    ids: {
                        requestId: request.requestId,
                        executionId: traceString("executionId"),
                        correlationId: traceString("correlationId"),
                        sessionId: request.sessionId,
                    },
                    mode: this.toLedgerMode(error.decision.outcome),
                    status: "denied",
                    guard: { dispatch: error.decision },
                });
                governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
                const blockedByDispatchGuard = {
                    ...this.executionHardener.buildFailureResult({
                        request,
                        status: "denied",
                        failureClass: "guard_blocked",
                        reasonCodes: [error.message],
                        stage: "policy_gated",
                    }),
                };
                this.recordInvocation({
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                    capabilityId: request.capabilityId,
                    selectedAt,
                    completedAt: blockedByDispatchGuard.completedAt,
                    resultStatus: blockedByDispatchGuard.status,
                    verificationInvoked: false,
                });
                const capabilityVerification = {
                    decision: "policy_rejected",
                    adoptable: false,
                    reasonCodes: [],
                    warnings: [],
                    normalizedStatus: blockedByDispatchGuard.status,
                };
                const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                    source: "capability_mesh_orchestrator",
                    ids: {
                        requestId: request.requestId,
                        executionId: traceString("executionId"),
                        correlationId: traceString("correlationId"),
                        sessionId: request.sessionId,
                    },
                    capabilityId: request.capabilityId,
                    capabilityStatus: blockedByDispatchGuard.status,
                    capabilityVerification,
                    dispatchGuardOutcome: error.decision.outcome,
                    shouldCommit: false,
                    governanceIssues,
                });
                return {
                    capability,
                    result: blockedByDispatchGuard,
                    capabilityVerification,
                    cognitiveSignals,
                    verificationDisposition: "unavailable",
                    governanceIssues,
                    invokable: false,
                    directCommitAllowed: false,
                    shouldCommit: false,
                };
            }
            const classified = this.executionHardener.classifyExecutionError(error);
            const failed = this.executionHardener.buildFailureResult({
                request,
                status: classified.status,
                failureClass: classified.failureClass,
                reasonCodes: classified.reasonCodes,
                stage: "execution_failed",
            });
            this.recordInvocation({
                requestId: request.requestId,
                sessionId: request.sessionId,
                capabilityId: request.capabilityId,
                selectedAt,
                completedAt: failed.completedAt,
                resultStatus: failed.status,
                verificationInvoked: false,
            });
            const capabilityVerification = {
                decision: "rejected",
                adoptable: false,
                reasonCodes: [],
                warnings: [],
                normalizedStatus: failed.status,
            };
            const normalizedGovernanceIssues = [...new Set([...governanceIssues, negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE])];
            const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
                source: "capability_mesh_orchestrator",
                ids: {
                    requestId: request.requestId,
                    executionId: traceString("executionId"),
                    correlationId: traceString("correlationId"),
                    sessionId: request.sessionId,
                },
                capabilityId: request.capabilityId,
                capabilityStatus: failed.status,
                capabilityVerification,
                shouldCommit: false,
                governanceIssues: normalizedGovernanceIssues,
            });
            return {
                capability,
                result: failed,
                capabilityVerification,
                cognitiveSignals,
                verificationDisposition: "unavailable",
                governanceIssues: normalizedGovernanceIssues,
                invokable: true,
                directCommitAllowed: capability.directBrainCommitAllowed,
                shouldCommit: false,
            };
        }
        const rawResult = guardedDispatch.value;
        this.executionLedger.append({
            category: "execution",
            eventType: "execution.started",
            action: request.purpose,
            source: "capability_mesh_orchestrator",
            target: request.capabilityId,
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            mode: this.toLedgerMode(guardedDispatch.decision.outcome),
            status: "started",
            metadata: { capabilityId: request.capabilityId },
        });
        this.executionLedger.append({
            category: "side_effect",
            eventType: "side_effect.intent",
            action: "capability_adaptor_invoke",
            source: "capability_mesh_orchestrator",
            target: request.capabilityId,
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            mode: this.toLedgerMode(guardedDispatch.decision.outcome),
            status: "intent",
            sideEffect: { intent: true, completed: false, hints: ["capability_adapter_dispatch"] },
        });
        const normalized = this.normalizeResultEnvelope(rawResult, request, capability);
        const result = normalized.result;
        governanceIssues.push(...normalized.governanceIssues);
        if (guardDecision.outcome === "require_audit") {
            result.warnings = [...(result.warnings ?? []), "runtime_guard_require_audit"];
        }
        if (guardDecision.outcome === "degraded_allow") {
            result.warnings = [...(result.warnings ?? []), "runtime_guard_degraded_allow"];
        }
        if (guardedDispatch.decision.outcome === "safe_mode_redirect" || guardedDispatch.decision.outcome === "deny") {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
        }
        if (guardedDispatch.decision.outcome === "reroute") {
            result.warnings = [...(result.warnings ?? []), "dispatch_guard_reroute"];
        }
        if (dispatchAuditRequired) {
            result.warnings = [...(result.warnings ?? []), "dispatch_guard_require_audit"];
        }
        if (dispatchDegraded) {
            result.warnings = [...(result.warnings ?? []), "dispatch_guard_degraded_allow"];
        }
        const capabilityVerification = (0, capability_verification_1.verifyCapabilityResult)({
            request,
            capability,
            result,
            runtimeGuardOutcome: guardDecision.outcome,
            dispatchGuardOutcome: guardedDispatch.decision.outcome,
        });
        if (capabilityVerification.decision === "invalid_result" ||
            capabilityVerification.decision === "inconsistent_result") {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
        }
        if (capabilityVerification.decision === "policy_rejected") {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
        }
        const verificationNeeded = capability.verificationMode !== "none" || result.verificationRequired;
        let verification;
        if (verificationNeeded) {
            verification = await this.verifyResult(request, result, capability);
            if (!verification) {
                governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE);
            }
            else if (verification.verdict === "reject") {
                governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED);
            }
        }
        const verificationDisposition = this.resolveVerificationDisposition(verificationNeeded, verification);
        const shouldCommit = result.status === "success" &&
            capabilityVerification.adoptable &&
            capability.directBrainCommitAllowed &&
            verificationDisposition === "passed";
        const cognitiveSignals = (0, cognitive_signal_system_1.deriveCapabilitySignals)({
            source: "capability_mesh_orchestrator",
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            capabilityId: request.capabilityId,
            capabilityStatus: result.status,
            capabilityVerification,
            runtimeGuardOutcome: guardDecision.outcome,
            dispatchGuardOutcome: guardedDispatch.decision.outcome,
            shouldCommit,
            governanceIssues,
            verificationRequired: verificationNeeded,
            confidence: result.confidence,
        });
        const isExecutionDenied = result.status === "blocked" ||
            result.status === "denied" ||
            result.status === "unavailable" ||
            result.status === "not_found" ||
            result.status === "invalid";
        const isExecutionFailed = result.status === "failed";
        this.executionLedger.append({
            category: "side_effect",
            eventType: "side_effect.completed",
            action: "capability_adaptor_invoke",
            source: "capability_mesh_orchestrator",
            target: request.capabilityId,
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            mode: this.toLedgerMode(guardedDispatch.decision.outcome),
            status: result.status === "success" || result.status === "degraded_success" ? "completed" : "failed",
            sideEffect: {
                intent: true,
                completed: result.status === "success" || result.status === "degraded_success",
                hints: ["capability_adapter_dispatch"],
            },
            metadata: { resultStatus: result.status },
        });
        this.executionLedger.append({
            category: "execution",
            eventType: isExecutionFailed ? "execution.failed" : isExecutionDenied ? "execution.denied" : "execution.completed",
            action: request.purpose,
            source: "capability_mesh_orchestrator",
            target: request.capabilityId,
            ids: {
                requestId: request.requestId,
                executionId: traceString("executionId"),
                correlationId: traceString("correlationId"),
                sessionId: request.sessionId,
            },
            mode: this.toLedgerMode(guardedDispatch.decision.outcome),
            status: isExecutionFailed ? "failed" : isExecutionDenied ? "denied" : "completed",
            metadata: {
                resultStatus: result.status,
                capabilityVerificationDecision: capabilityVerification.decision,
                capabilityVerificationAdoptable: capabilityVerification.adoptable,
                verificationDisposition,
                shouldCommit,
            },
        });
        this.recordInvocation({
            requestId: request.requestId,
            sessionId: request.sessionId,
            capabilityId: request.capabilityId,
            selectedAt,
            completedAt: result.completedAt,
            resultStatus: result.status,
            verificationInvoked: verificationNeeded,
            verificationVerdict: verification?.verdict,
        });
        return {
            capability,
            result,
            capabilityVerification,
            cognitiveSignals,
            verification,
            verificationDisposition,
            governanceIssues: [...new Set(governanceIssues)],
            invokable: true,
            directCommitAllowed: capability.directBrainCommitAllowed,
            shouldCommit,
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
    getExecutionLedgerSnapshot() {
        return this.executionLedger.snapshot();
    }
    getCanonicalTimelineSnapshot() {
        return this.executionLedger.timelineSnapshot();
    }
    async verifyResult(request, result, capability) {
        const verifier = this.adaptors.get(constants_1.CAPABILITY_IDS.VERIFICATION);
        if (!verifier) {
            return undefined;
        }
        const verificationRequest = {
            verificationRequestId: `verify-${request.requestId}`,
            sessionId: request.sessionId,
            capabilityId: capability.capabilityId,
            capabilityResult: result,
            requestedAt: new Date().toISOString(),
            trace: request.trace ? { ...request.trace } : undefined,
        };
        const verificationResult = await verifier.invoke({
            requestId: `${request.requestId}-verification`,
            sessionId: request.sessionId,
            capabilityId: constants_1.CAPABILITY_IDS.VERIFICATION,
            purpose: "verify_capability_result",
            input: verificationRequest,
            createdAt: new Date().toISOString(),
        });
        return verificationResult.payload;
    }
    recordInvocation(record) {
        this.invocationRecords.push(record);
        if (this.invocationRecords.length > 500) {
            this.invocationRecords.splice(0, this.invocationRecords.length - 500);
        }
    }
    normalizeResultEnvelope(result, request, capability) {
        const governanceIssues = [];
        if (result.requestId !== request.requestId ||
            result.sessionId !== request.sessionId ||
            result.capabilityId !== request.capabilityId) {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
        }
        if (result.status !== "success" &&
            result.status !== "degraded_success" &&
            result.status !== "failed" &&
            result.status !== "blocked" &&
            result.status !== "denied" &&
            result.status !== "not_found" &&
            result.status !== "invalid" &&
            result.status !== "unavailable") {
            governanceIssues.push(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
        }
        return {
            governanceIssues,
            result: this.executionHardener.normalizeResult({
                request,
                rawResult: result,
                stage: "result_normalized",
                diagnostics: {
                    capabilityRiskLevel: capability.riskLevel,
                    capabilityVerificationMode: capability.verificationMode,
                    capabilityStatus: capability.status,
                },
            }),
        };
    }
    buildUnknownCapability(capabilityId, description) {
        return {
            capabilityId,
            name: "unknown",
            family: "knowledge",
            version: "0.0.0",
            status: "retired",
            description,
            ownerAuthority: "unknown",
            allowedOperations: [],
            verificationMode: "required",
            riskLevel: "high",
            directBrainCommitAllowed: false,
        };
    }
    resolveVerificationDisposition(verificationNeeded, verification) {
        if (!verificationNeeded) {
            return "passed";
        }
        if (!verification) {
            return "unavailable";
        }
        if (verification.verdict === "accept") {
            return "passed";
        }
        if (verification.verdict === "reject") {
            return "failed";
        }
        if (verification.verdict === "review" || verification.verdict === "escalate") {
            return "downgraded";
        }
        return "inconclusive";
    }
}
exports.CapabilityMeshOrchestrator = CapabilityMeshOrchestrator;
function createDefaultCapabilityMeshOrchestrator(retrievalRecords = []) {
    const registry = new capability_registry_1.CapabilityRegistry();
    const orchestrator = new CapabilityMeshOrchestrator(registry, [
        new language_capability_1.LanguageCapability(),
        new retrieval_capability_1.RetrievalCapability(retrievalRecords),
        new verification_capability_1.VerificationCapability(),
    ]);
    return orchestrator;
}
