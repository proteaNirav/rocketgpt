import { CAPABILITY_IDS } from "../constants";
import type { CapabilityAdaptor } from "../adaptors/capability-adaptor";
import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type { CapabilityResultEnvelope } from "../types/capability-result.types";
import { CapabilityRegistry } from "../registry/capability-registry";
import type {
  VerificationRequestEnvelope,
  VerificationResultEnvelope,
  VerificationTrustDisposition,
} from "../types/verification.types";
import { VerificationCapability } from "../adaptors/verification-capability";
import { LanguageCapability } from "../adaptors/language-capability";
import { RetrievalCapability, type RetrievalRecord } from "../adaptors/retrieval-capability";
import type { CapabilityDefinition } from "../types/capability.types";
import { CapabilityExecutionHardener } from "./capability-execution-hardener";
import {
  verifyCapabilityResult,
  type CapabilityVerificationOutcome,
} from "./capability-verification";
import { NEGATIVE_PATH_ISSUES, type NegativePathIssueCode } from "../../governance/negative-path-taxonomy";
import { RuntimeGuard, type RuntimeGuardActionType } from "../../runtime/runtime-guard";
import {
  DispatchGuard,
  DispatchGuardDeniedError,
  executeWithDispatchGuard,
  type DispatchGuardDecision,
} from "../../runtime/dispatch-guard";
import { ExecutionLedger, getExecutionLedger } from "../../runtime/execution-ledger";
import {
  deriveCapabilitySignals,
  type CognitiveRuntimeSignal,
} from "../../runtime/cognitive-signal-system";
import { evaluateRuntimeContainmentEligibility } from "../../runtime/containment/runtime-containment-eligibility";

export interface CapabilityInvocationRecord {
  requestId: string;
  sessionId: string;
  capabilityId: string;
  selectedAt: string;
  completedAt: string;
  resultStatus: CapabilityResultEnvelope["status"];
  verificationInvoked: boolean;
  verificationVerdict?: VerificationResultEnvelope["verdict"];
}

export interface CapabilityInvocationOutcome {
  capability: CapabilityDefinition;
  result: CapabilityResultEnvelope;
  capabilityVerification: CapabilityVerificationOutcome;
  cognitiveSignals: CognitiveRuntimeSignal[];
  verification?: VerificationResultEnvelope;
  verificationDisposition: VerificationTrustDisposition;
  governanceIssues: NegativePathIssueCode[];
  invokable: boolean;
  directCommitAllowed: boolean;
  shouldCommit: boolean;
}

export class CapabilityMeshOrchestrator {
  private readonly adaptors = new Map<string, CapabilityAdaptor>();
  private readonly invocationRecords: CapabilityInvocationRecord[] = [];
  private readonly executionHardener = new CapabilityExecutionHardener();

  constructor(
    private readonly registry: CapabilityRegistry,
    adaptors: CapabilityAdaptor[] = [],
    private readonly runtimeGuard = new RuntimeGuard(),
    private readonly dispatchGuard = new DispatchGuard(),
    private readonly executionLedger: ExecutionLedger = getExecutionLedger()
  ) {
    for (const adaptor of adaptors) {
      this.registerAdaptor(adaptor);
    }
  }

  registerAdaptor(adaptor: CapabilityAdaptor): void {
    const definition = adaptor.getCapabilityDefinition();
    this.registry.register(definition);
    this.adaptors.set(definition.capabilityId, adaptor);
  }

  getRegistry(): CapabilityRegistry {
    return this.registry;
  }

  listInvocationRecords(sessionId?: string): CapabilityInvocationRecord[] {
    return this.invocationRecords
      .filter((record) => (sessionId ? record.sessionId === sessionId : true))
      .map((record) => ({ ...record }));
  }

  async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityInvocationOutcome> {
    const selectedAt = new Date().toISOString();
    const governanceIssues: NegativePathIssueCode[] = [];
    const normalizedRequest = this.executionHardener.normalizeRequest(request);
    request = normalizedRequest.request;
    if (!normalizedRequest.valid) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
      const invalid = this.executionHardener.buildFailureResult({
        request,
        status: "invalid",
        failureClass: "invalid_request",
        reasonCodes: normalizedRequest.reasonCodes,
        stage: "input_normalized",
      });
      const cognitiveSignals = deriveCapabilitySignals({
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
        governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE);
      }
      if (
        eligibility.status === "denied" ||
        eligibility.status === "blocked" ||
        eligibility.failureClass === "capability_disabled" ||
        eligibility.failureClass === "operation_not_supported" ||
        eligibility.failureClass === "context_requirements_missing"
      ) {
        governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
      }
      const result = this.executionHardener.buildFailureResult({
        request,
        status: eligibility.status,
        failureClass: eligibility.failureClass ?? "capability_unavailable",
        reasonCodes: eligibility.reasonCodes,
        stage: "capability_eligibility_checked",
      });
      const capabilityVerification: CapabilityVerificationOutcome = {
        decision: eligibility.status === "denied" || eligibility.status === "blocked" ? "policy_rejected" : "rejected",
        adoptable: false,
        reasonCodes: [],
        warnings: [],
        normalizedStatus: result.status,
      };
      const cognitiveSignals = deriveCapabilitySignals({
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
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE);
      const unavailable = this.executionHardener.buildFailureResult({
        request,
        status: "unavailable",
        failureClass: "capability_unavailable",
        reasonCodes: ["capability_adaptor_missing"],
        stage: "capability_eligibility_checked",
      });
      const capabilityVerification: CapabilityVerificationOutcome = {
        decision: "rejected",
        adoptable: false,
        reasonCodes: [],
        warnings: [],
        normalizedStatus: unavailable.status,
      };
      const cognitiveSignals = deriveCapabilitySignals({
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

    const containmentEligibility = await evaluateRuntimeContainmentEligibility("capability", request.capabilityId);
    if (!containmentEligibility.eligible) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
      const blockedByContainment = this.executionHardener.buildFailureResult({
        request,
        status: "denied",
        failureClass: "guard_blocked",
        reasonCodes: containmentEligibility.reasonCodes,
        stage: "policy_gated",
      });
      this.executionLedger.append({
        category: "dispatch",
        eventType: "dispatch.denied",
        action: request.purpose,
        source: "capability_mesh_orchestrator",
        target: request.capabilityId,
        ids: {
          requestId: request.requestId,
          sessionId: request.sessionId,
        },
        mode: "normal",
        status: "denied",
        metadata: {
          containmentBlocked: true,
          containmentStatus: containmentEligibility.status,
          reasonCodes: containmentEligibility.reasonCodes,
        },
      });
      this.recordInvocation({
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        selectedAt,
        completedAt: blockedByContainment.completedAt,
        resultStatus: blockedByContainment.status,
        verificationInvoked: false,
      });
      const capabilityVerification: CapabilityVerificationOutcome = {
        decision: "policy_rejected",
        adoptable: false,
        reasonCodes: [],
        warnings: [],
        normalizedStatus: blockedByContainment.status,
      };
      const cognitiveSignals = deriveCapabilitySignals({
        source: "capability_mesh_orchestrator",
        ids: {
          requestId: request.requestId,
          sessionId: request.sessionId,
        },
        capabilityId: request.capabilityId,
        capabilityStatus: blockedByContainment.status,
        capabilityVerification,
        shouldCommit: false,
        governanceIssues,
      });
      return {
        capability,
        result: blockedByContainment,
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
    const traceString = (key: string): string | undefined => {
      const value = trace[key];
      return typeof value === "string" && value.trim().length > 0 ? value : undefined;
    };
    const traceBoolean = (key: string): boolean => trace[key] === true;
    const guardActionType: RuntimeGuardActionType =
      request.capabilityId === CAPABILITY_IDS.RETRIEVAL ? "data_sensitive_operation" : "provider_tool_invocation";
    const guardDecision = this.runtimeGuard.evaluate({
      actionType: guardActionType,
      actor: "capability_mesh_orchestrator",
      source: traceString("sourceType"),
      target: request.capabilityId,
      requestedOperation: request.purpose,
      sensitivityHints: [capability.riskLevel, request.expectedOutputType].filter(
        (hint): hint is string => typeof hint === "string" && hint.length > 0
      ),
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
      governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
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
      const capabilityVerification: CapabilityVerificationOutcome = {
        decision: "policy_rejected",
        adoptable: false,
        reasonCodes: [],
        warnings: [],
        normalizedStatus: blockedByGuard.status,
      };
      const cognitiveSignals = deriveCapabilitySignals({
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
    let guardedDispatch: { decision: DispatchGuardDecision; value: CapabilityResultEnvelope };
    try {
      guardedDispatch = await executeWithDispatchGuard(this.dispatchGuard, {
        category: "capability_dispatch",
        source: "capability_mesh_orchestrator",
        sourceType: traceString("sourceType"),
        target: request.capabilityId,
        targetKind: "internal",
        route: "capability_adapter",
        mode: "sync",
        targetTrustHint:
          capability.status === "suspended"
            ? "blocked"
            : capability.status === "restricted"
              ? "restricted"
              : capability.status === "retired"
                ? "quarantined"
                : "trusted",
        targetHealthHint: capability.status === "active" ? "healthy" : "degraded",
        sensitivityHints: [capability.riskLevel, request.expectedOutputType].filter(
          (hint): hint is string => typeof hint === "string" && hint.length > 0
        ),
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
          } catch (error) {
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
        onSafeModeRedirect: () =>
          Promise.resolve(
            this.executionHardener.buildFailureResult({
              request,
              status: "denied",
              failureClass: "guard_blocked",
              reasonCodes: ["dispatch_guard_safe_mode_redirect"],
              stage: "policy_gated",
            })
          ),
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
          } catch (error) {
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
    } catch (error) {
      if (error instanceof DispatchGuardDeniedError) {
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
        governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
        const blockedByDispatchGuard: CapabilityResultEnvelope = {
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
        const capabilityVerification: CapabilityVerificationOutcome = {
          decision: "policy_rejected",
          adoptable: false,
          reasonCodes: [],
          warnings: [],
          normalizedStatus: blockedByDispatchGuard.status,
        };
        const cognitiveSignals = deriveCapabilitySignals({
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
      const capabilityVerification: CapabilityVerificationOutcome = {
        decision: "rejected",
        adoptable: false,
        reasonCodes: [],
        warnings: [],
        normalizedStatus: failed.status,
      };
      const normalizedGovernanceIssues = [...new Set([...governanceIssues, NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE])];
      const cognitiveSignals = deriveCapabilitySignals({
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
      governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
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
    const capabilityVerification = verifyCapabilityResult({
      request,
      capability,
      result,
      runtimeGuardOutcome: guardDecision.outcome,
      dispatchGuardOutcome: guardedDispatch.decision.outcome,
    });
    if (
      capabilityVerification.decision === "invalid_result" ||
      capabilityVerification.decision === "inconsistent_result"
    ) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
    }
    if (capabilityVerification.decision === "policy_rejected") {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
    }

    const verificationNeeded = capability.verificationMode !== "none" || result.verificationRequired;
    let verification: VerificationResultEnvelope | undefined;
    if (verificationNeeded) {
      verification = await this.verifyResult(request, result, capability);
      if (!verification) {
        governanceIssues.push(NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE);
      } else if (verification.verdict === "reject") {
        governanceIssues.push(NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED);
      }
    }

    const verificationDisposition: VerificationTrustDisposition = this.resolveVerificationDisposition(
      verificationNeeded,
      verification
    );

    const shouldCommit =
      result.status === "success" &&
      capabilityVerification.adoptable &&
      capability.directBrainCommitAllowed &&
      verificationDisposition === "passed";
    const cognitiveSignals = deriveCapabilitySignals({
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
    const isExecutionDenied =
      result.status === "blocked" ||
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

  private toLedgerMode(outcome: string): "normal" | "reroute" | "degraded" | "safe_mode_redirect" | "audit_required" {
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

  private async verifyResult(
    request: CapabilityRequestEnvelope,
    result: CapabilityResultEnvelope,
    capability: CapabilityDefinition
  ): Promise<VerificationResultEnvelope | undefined> {
    const verifier = this.adaptors.get(CAPABILITY_IDS.VERIFICATION);
    if (!verifier) {
      return undefined;
    }
    const verificationRequest: VerificationRequestEnvelope = {
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
      capabilityId: CAPABILITY_IDS.VERIFICATION,
      purpose: "verify_capability_result",
      input: verificationRequest,
      createdAt: new Date().toISOString(),
    });
    return verificationResult.payload as VerificationResultEnvelope;
  }

  private recordInvocation(record: CapabilityInvocationRecord): void {
    this.invocationRecords.push(record);
    if (this.invocationRecords.length > 500) {
      this.invocationRecords.splice(0, this.invocationRecords.length - 500);
    }
  }

  private normalizeResultEnvelope(
    result: CapabilityResultEnvelope,
    request: CapabilityRequestEnvelope,
    capability: CapabilityDefinition
  ): { result: CapabilityResultEnvelope; governanceIssues: NegativePathIssueCode[] } {
    const governanceIssues: NegativePathIssueCode[] = [];
    if (
      result.requestId !== request.requestId ||
      result.sessionId !== request.sessionId ||
      result.capabilityId !== request.capabilityId
    ) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
    }
    if (
      result.status !== "success" &&
      result.status !== "degraded_success" &&
      result.status !== "failed" &&
      result.status !== "blocked" &&
      result.status !== "denied" &&
      result.status !== "not_found" &&
      result.status !== "invalid" &&
      result.status !== "unavailable"
    ) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
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

  private buildUnknownCapability(capabilityId: string, description: string): CapabilityDefinition {
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

  private resolveVerificationDisposition(
    verificationNeeded: boolean,
    verification?: VerificationResultEnvelope
  ): VerificationTrustDisposition {
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

export function createDefaultCapabilityMeshOrchestrator(
  retrievalRecords: RetrievalRecord[] = []
): CapabilityMeshOrchestrator {
  const registry = new CapabilityRegistry();
  const orchestrator = new CapabilityMeshOrchestrator(registry, [
    new LanguageCapability(),
    new RetrievalCapability(retrievalRecords),
    new VerificationCapability(),
  ]);
  return orchestrator;
}
