import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CAPABILITY_IDS } from "../capabilities/constants";
import { LanguageCapability } from "../capabilities/adaptors/language-capability";
import { VerificationCapability } from "../capabilities/adaptors/verification-capability";
import { CapabilityRegistry } from "../capabilities/registry/capability-registry";
import { CapabilityMeshOrchestrator } from "../capabilities/orchestration/capability-mesh-orchestrator";
import { RetrievalCapability } from "../capabilities/adaptors/retrieval-capability";
import type { CapabilityAdaptor } from "../capabilities/adaptors/capability-adaptor";
import type { CapabilityDefinition } from "../capabilities/types/capability.types";
import type { CapabilityRequestEnvelope } from "../capabilities/types/capability-request.types";
import type { CapabilityResultEnvelope } from "../capabilities/types/capability-result.types";
import { NEGATIVE_PATH_ISSUES } from "../governance/negative-path-taxonomy";

test("orchestrator invokes approved capability and returns standardized outcome", async () => {
  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [
    new LanguageCapability(),
    new VerificationCapability(),
  ]);

  const outcome = await orchestrator.invoke({
    requestId: "req-orch-1",
    sessionId: "session-orch",
    capabilityId: CAPABILITY_IDS.LANGUAGE,
    purpose: "normalize",
    input: "hello  mesh",
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.invokable, true);
  assert.equal(outcome.result.status, "success");
  assert.equal(outcome.shouldCommit, true);
});

test("orchestrator blocks suspended capability", async () => {
  class SuspendedLanguageCapability extends LanguageCapability {
    override getCapabilityDefinition() {
      return {
        ...super.getCapabilityDefinition(),
        status: "suspended" as const,
      };
    }
  }
  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [
    new SuspendedLanguageCapability(),
    new VerificationCapability(),
  ]);

  const outcome = await orchestrator.invoke({
    requestId: "req-orch-2",
    sessionId: "session-orch",
    capabilityId: CAPABILITY_IDS.LANGUAGE,
    purpose: "normalize",
    input: "hello",
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.invokable, false);
  assert.equal(outcome.result.status, "blocked");
});

test("orchestrator applies verification for required capability", async () => {
  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [
    new RetrievalCapability([{ id: "r1", text: "mesh contracts" }]),
    new VerificationCapability(),
  ]);

  const outcome = await orchestrator.invoke({
    requestId: "req-orch-3",
    sessionId: "session-orch",
    capabilityId: CAPABILITY_IDS.RETRIEVAL,
    purpose: "lookup",
    input: { query: "mesh" },
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.result.status, "success");
  assert.ok(outcome.verification);
  assert.equal(outcome.shouldCommit, false);
  assert.equal(outcome.verificationDisposition, "passed");
  assert.equal(outcome.governanceIssues.includes(NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED), false);
});

test("orchestrator does not commit when verification is required but verifier is missing", async () => {
  class RequiredCommitCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: "cap.required.commit.v1",
        name: "required-commit-capability",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "requires verification",
        ownerAuthority: "test",
        allowedOperations: ["test.required"],
        verificationMode: "required",
        riskLevel: "medium",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      return {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "success",
        payload: { ok: true },
        verificationRequired: true,
        completedAt: new Date().toISOString(),
      };
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new RequiredCommitCapability()]);
  const outcome = await orchestrator.invoke({
    requestId: "req-orch-missing-verifier",
    sessionId: "session-orch",
    capabilityId: "cap.required.commit.v1",
    purpose: "required-check",
    input: {},
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.result.status, "success");
  assert.equal(outcome.verification, undefined);
  assert.equal(outcome.shouldCommit, false);
  assert.equal(outcome.verificationDisposition, "unavailable");
  assert.equal(outcome.governanceIssues.includes(NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE), true);
});

test("orchestrator normalizes malformed capability result envelope", async () => {
  class MalformedCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: "cap.malformed.v1",
        name: "malformed-capability",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "returns malformed result",
        ownerAuthority: "test",
        allowedOperations: ["test.malformed"],
        verificationMode: "none",
        riskLevel: "low",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(_request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      return {
        requestId: "wrong-request",
        sessionId: "wrong-session",
        capabilityId: "wrong-capability",
        status: "success-unknown" as unknown as CapabilityResultEnvelope["status"],
        confidence: Number.NaN,
        verificationRequired: undefined as unknown as boolean,
        completedAt: "",
      };
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new MalformedCapability()]);
  const outcome = await orchestrator.invoke({
    requestId: "req-orch-malformed",
    sessionId: "session-orch",
    capabilityId: "cap.malformed.v1",
    purpose: "malformed-check",
    input: {},
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.result.requestId, "req-orch-malformed");
  assert.equal(outcome.result.sessionId, "session-orch");
  assert.equal(outcome.result.capabilityId, "cap.malformed.v1");
  assert.equal(outcome.result.status, "unavailable");
  assert.equal(outcome.result.verificationRequired, false);
  assert.equal(typeof outcome.result.completedAt, "string");
  assert.equal(outcome.shouldCommit, false);
  assert.equal(outcome.governanceIssues.includes(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT), true);
});

test("orchestrator preserves verification-failed trust disposition and blocks commit", async () => {
  class RejectingVerificationCapability extends VerificationCapability {
    override verify(request: Parameters<VerificationCapability["verify"]>[0]) {
      return {
        ...super.verify(request),
        verdict: "reject" as const,
        recommendedAction: "reject" as const,
      };
    }
  }

  class CommitCandidateCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: "cap.commit.candidate.v1",
        name: "commit-candidate",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "candidate commit path",
        ownerAuthority: "test",
        allowedOperations: ["candidate.run"],
        verificationMode: "required",
        riskLevel: "medium",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      return {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "success",
        payload: { ok: true },
        verificationRequired: true,
        completedAt: new Date().toISOString(),
      };
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [
    new CommitCandidateCapability(),
    new RejectingVerificationCapability(),
  ]);
  const outcome = await orchestrator.invoke({
    requestId: "req-orch-verify-reject",
    sessionId: "session-orch",
    capabilityId: "cap.commit.candidate.v1",
    purpose: "verify-and-commit",
    input: { value: 1 },
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.verificationDisposition, "failed");
  assert.equal(outcome.governanceIssues.includes(NEGATIVE_PATH_ISSUES.VERIFICATION_FAILED), true);
  assert.equal(outcome.shouldCommit, false);
});

test("orchestrator preserves downgraded non-trusted outcome without dropping result", async () => {
  class ReviewVerificationCapability extends VerificationCapability {
    override verify(request: Parameters<VerificationCapability["verify"]>[0]) {
      return {
        ...super.verify(request),
        verdict: "review" as const,
        recommendedAction: "review" as const,
      };
    }
  }

  class DowngradedCandidateCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: "cap.downgraded.candidate.v1",
        name: "downgraded-candidate",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "returns success but needs verification",
        ownerAuthority: "test",
        allowedOperations: ["candidate.review"],
        verificationMode: "required",
        riskLevel: "medium",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      return {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "success",
        payload: { ok: true, detail: "non_trusted_review" },
        verificationRequired: true,
        completedAt: new Date().toISOString(),
      };
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [
    new DowngradedCandidateCapability(),
    new ReviewVerificationCapability(),
  ]);
  const outcome = await orchestrator.invoke({
    requestId: "req-orch-verify-review",
    sessionId: "session-orch",
    capabilityId: "cap.downgraded.candidate.v1",
    purpose: "verify-review",
    input: { value: 1 },
    createdAt: new Date().toISOString(),
  });

  assert.equal(outcome.result.status, "success");
  assert.equal(outcome.verificationDisposition, "downgraded");
  assert.equal(outcome.shouldCommit, false);
  assert.ok(outcome.result.payload);
});
