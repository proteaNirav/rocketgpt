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
import type { CapabilityResultStatus } from "../types/capability-result.types";
import { NEGATIVE_PATH_ISSUES, type NegativePathIssueCode } from "../../governance/negative-path-taxonomy";

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

  constructor(
    private readonly registry: CapabilityRegistry,
    adaptors: CapabilityAdaptor[] = []
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
    const capability = this.registry.getById(request.capabilityId);
    if (!capability) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_UNAVAILABLE);
      const result: CapabilityResultEnvelope = {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "unavailable",
        errors: ["capability_not_registered"],
        verificationRequired: false,
        completedAt: new Date().toISOString(),
      };
      return {
        capability: {
          capabilityId: request.capabilityId,
          name: "unknown",
          family: "knowledge",
          version: "0.0.0",
          status: "retired",
          description: "unknown capability placeholder",
          ownerAuthority: "unknown",
          allowedOperations: [],
          verificationMode: "required",
          riskLevel: "high",
          directBrainCommitAllowed: false,
        },
        result,
        verificationDisposition: "unavailable",
        governanceIssues,
        invokable: false,
        directCommitAllowed: false,
        shouldCommit: false,
      };
    }

    if (!this.registry.isInvokable(request.capabilityId)) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.GUARDRAIL_BLOCKED);
      const blocked: CapabilityResultEnvelope = {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "blocked",
        errors: [`capability_status_not_invokable:${capability.status}`],
        verificationRequired: false,
        completedAt: new Date().toISOString(),
      };
      this.recordInvocation({
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        selectedAt,
        completedAt: blocked.completedAt,
        resultStatus: blocked.status,
        verificationInvoked: false,
      });
      return {
        capability,
        result: blocked,
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
      const unavailable: CapabilityResultEnvelope = {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "unavailable",
        errors: ["capability_adaptor_missing"],
        verificationRequired: false,
        completedAt: new Date().toISOString(),
      };
      return {
        capability,
        result: unavailable,
        verificationDisposition: "unavailable",
        governanceIssues,
        invokable: false,
        directCommitAllowed: false,
        shouldCommit: false,
      };
    }

    const rawResult = await adaptor.invoke(request);
    const normalized = this.normalizeResultEnvelope(rawResult, request);
    const result = normalized.result;
    governanceIssues.push(...normalized.governanceIssues);
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
      capability.directBrainCommitAllowed &&
      verificationDisposition === "passed";

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
      verification,
      verificationDisposition,
      governanceIssues: [...new Set(governanceIssues)],
      invokable: true,
      directCommitAllowed: capability.directBrainCommitAllowed,
      shouldCommit,
    };
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
    request: CapabilityRequestEnvelope
  ): { result: CapabilityResultEnvelope; governanceIssues: NegativePathIssueCode[] } {
    const governanceIssues: NegativePathIssueCode[] = [];
    const hasValidStatus =
      result.status === "success" ||
      result.status === "failed" ||
      result.status === "blocked" ||
      result.status === "unavailable";
    if (!hasValidStatus) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
    }
    const status: CapabilityResultStatus = hasValidStatus ? result.status : "unavailable";

    if (
      result.requestId !== request.requestId ||
      result.sessionId !== request.sessionId ||
      result.capabilityId !== request.capabilityId
    ) {
      governanceIssues.push(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT);
    }

    const confidence =
      Number.isFinite(result.confidence) && typeof result.confidence === "number"
        ? Math.max(0, Math.min(1, result.confidence))
        : undefined;

    return {
      governanceIssues,
      result: {
      requestId: request.requestId,
      sessionId: request.sessionId,
      capabilityId: request.capabilityId,
      status,
      payload: result.payload,
      confidence,
      freshness: result.freshness,
      sourceMetadata: result.sourceMetadata ? { ...result.sourceMetadata } : undefined,
      warnings: result.warnings ? [...result.warnings] : undefined,
      errors: result.errors ? [...result.errors] : undefined,
      verificationRequired: Boolean(result.verificationRequired),
      trace: result.trace ? { ...result.trace } : undefined,
      completedAt: result.completedAt || new Date().toISOString(),
      },
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
