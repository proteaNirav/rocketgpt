import { test } from "node:test";
import * as assert from "node:assert/strict";
import {
  DECISION_CATEGORIES,
  REASONING_CONTEXT_TYPES,
  WORKING_MEMORY_KEYS,
} from "../brain/constants";
import { CAPABILITY_IDS } from "../capabilities/constants";
import type { CapabilityAdaptor } from "../capabilities/adaptors/capability-adaptor";
import { CapabilityRegistry } from "../capabilities/registry/capability-registry";
import { CapabilityMeshOrchestrator } from "../capabilities/orchestration/capability-mesh-orchestrator";
import type { CapabilityRequestEnvelope } from "../capabilities/types/capability-request.types";
import type { CapabilityResultEnvelope } from "../capabilities/types/capability-result.types";
import type { CapabilityDefinition } from "../capabilities/types/capability.types";
import { MeshLiveRuntime } from "../runtime/mesh-live-runtime";
import { MeshRouter, type MeshRouteResult } from "../routing/mesh-router";
import { RuntimeGuard, normalizeRuntimeGuardContext } from "../runtime/runtime-guard";

test("mesh live runtime creates session brain and records cognitive session data", async () => {
  const runtime = new MeshLiveRuntime();
  const sessionId = "session-brain-runtime";

  await runtime.processChatUserRequest({
    sessionId,
    requestId: "req-session-brain",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "summarize status" },
    metadata: { sourceType: "chat.user_text" },
  });

  const snapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_session_brain_snapshot");
  }
  assert.equal(snapshot.sessionId, sessionId);
  assert.equal(snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_ROUTE_TYPE]?.value, "/api/demo/chat");
  assert.equal(
    snapshot.reasoningContext.some((entry) => entry.type === REASONING_CONTEXT_TYPES.INPUT_RECEIVED),
    true
  );
  assert.equal(
    snapshot.decisionTrail.some((entry) => entry.category === DECISION_CATEGORIES.ROUTE_OUTCOME),
    true
  );
  assert.equal(
    snapshot.decisionTrail.some((entry) => entry.category === DECISION_CATEGORIES.CAPABILITY_SELECTION),
    true
  );
  assert.equal(
    snapshot.decisionTrail.some((entry) => entry.category === DECISION_CATEGORIES.CAPABILITY_OUTCOME),
    true
  );
  assert.equal(
    snapshot.reasoningContext.some((entry) => entry.type === REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED),
    true
  );
  assert.equal(
    snapshot.reasoningContext.some((entry) =>
      entry.type === REASONING_CONTEXT_TYPES.CAPABILITY_INVOKED &&
      Array.isArray((entry.metadata as Record<string, unknown> | undefined)?.cognitiveSignalTypes)
    ),
    true
  );
  assert.equal(snapshot.decisionTrail.length >= 1, true);
  assert.equal(typeof snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_STATUS]?.value, "string");
  assert.equal(snapshot.reasoningContext.length >= 1, true);
  assert.equal(snapshot.cognitiveTransitions.length >= 4, true);
  assert.equal(snapshot.stateTransitionCount, snapshot.cognitiveTransitions.length);
  assert.equal(snapshot.workingMemoryCount >= 1, true);
  assert.equal(snapshot.reasoningContextCount, snapshot.reasoningContext.length);
  assert.equal(snapshot.decisionCount, snapshot.decisionTrail.length);
  assert.equal(snapshot.isTerminal, true);
  assert.equal(snapshot.cognitiveState, "completed");
});

test("mesh live runtime marks failed state on thrown route error", async () => {
  class ThrowingRouter extends MeshRouter {
    override async route(): Promise<MeshRouteResult> {
      throw new Error("forced_route_error");
    }
  }

  const runtime = new MeshLiveRuntime(undefined, new ThrowingRouter());
  const sessionId = "session-brain-failure";

  await assert.rejects(
    runtime.processChatUserRequest({
      sessionId,
      requestId: "req-session-failure",
      routeType: "/api/demo/chat",
      rawInput: { prompt: "fail now" },
      metadata: { sourceType: "chat.user_text" },
    }),
    /forced_route_error/
  );

  const snapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_failure_snapshot");
  }
  assert.equal(snapshot.cognitiveState, "failed");
  assert.equal(snapshot.isTerminal, true);
  assert.equal(
    snapshot.decisionTrail.some((entry) => entry.category === DECISION_CATEGORIES.ROUTE_ERROR),
    true
  );
});

test("mesh live runtime supports terminal session cleanup helpers", async () => {
  const runtime = new MeshLiveRuntime();
  const sessionId = "session-brain-cleanup";

  await runtime.processWorkflowTrigger({
    sessionId,
    requestId: "req-session-cleanup",
    routeType: "/api/orchestrator/run/status",
    rawInput: { runId: 101, status: "started" },
    metadata: { sourceType: "workflow.trigger" },
  });

  assert.equal(runtime.hasActiveSessionBrain(sessionId), false);
  assert.equal(runtime.destroySessionBrainIfTerminal(sessionId), true);
  assert.equal(runtime.getSessionBrainSnapshot(sessionId), undefined);
});

test("mesh live runtime strict capability failure marks session failed", async () => {
  class ThrowingLanguageCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: CAPABILITY_IDS.LANGUAGE,
        name: "throwing-language",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "test adaptor",
        ownerAuthority: "test",
        allowedOperations: ["language.normalize"],
        verificationMode: "none",
        riskLevel: "low",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(_request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      throw new Error("capability_failure");
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new ThrowingLanguageCapability()]);
  const runtime = new MeshLiveRuntime(undefined, new MeshRouter(), {
    capabilityOrchestrator: orchestrator,
    capabilityFailureMode: "strict",
  });

  const sessionId = "session-capability-failure";
  await assert.rejects(
    runtime.processChatUserRequest({
      sessionId,
      requestId: "req-capability-failure",
      routeType: "/api/demo/chat",
      rawInput: { prompt: "trigger capability failure" },
      metadata: { sourceType: "chat.user_text" },
    }),
    /capability_failure/
  );

  const snapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_capability_failure_snapshot");
  }
  assert.equal(snapshot.cognitiveState, "failed");
  assert.equal(snapshot.isTerminal, true);
});

test("mesh live runtime does not silently adopt verifier-rejected capability result", async () => {
  class NonAdoptableLanguageCapability implements CapabilityAdaptor {
    getCapabilityDefinition(): CapabilityDefinition {
      return {
        capabilityId: CAPABILITY_IDS.LANGUAGE,
        name: "non-adoptable-language",
        family: "knowledge",
        version: "1.0.0",
        status: "active",
        description: "returns success without payload",
        ownerAuthority: "test",
        allowedOperations: ["language.normalize"],
        verificationMode: "none",
        riskLevel: "low",
        directBrainCommitAllowed: true,
      };
    }
    async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
      return {
        requestId: request.requestId,
        sessionId: request.sessionId,
        capabilityId: request.capabilityId,
        status: "success",
        payload: undefined,
        verificationRequired: false,
        completedAt: new Date().toISOString(),
      };
    }
  }

  const orchestrator = new CapabilityMeshOrchestrator(new CapabilityRegistry(), [new NonAdoptableLanguageCapability()]);
  const runtime = new MeshLiveRuntime(undefined, new MeshRouter(), {
    capabilityOrchestrator: orchestrator,
    capabilityFailureMode: "fallback",
  });

  const sessionId = "session-capability-verifier-reject";
  await runtime.processChatUserRequest({
    sessionId,
    requestId: "req-capability-verifier-reject",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "trigger non adoptable" },
    metadata: { sourceType: "chat.user_text" },
  });

  const snapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(snapshot);
  if (!snapshot) {
    throw new Error("missing_verifier_reject_snapshot");
  }
  assert.equal(
    Object.prototype.hasOwnProperty.call(snapshot.workingMemory, `runtime.capability.${CAPABILITY_IDS.LANGUAGE}.payload`),
    false
  );
  assert.equal(
    snapshot.workingMemory[WORKING_MEMORY_KEYS.LAST_MEMORY_ADOPTION_STATUS]?.value,
    "invalid_memory_candidate"
  );
  const signals = runtime.getSessionCognitiveSignals(sessionId);
  assert.equal(signals.some((signal) => signal.signalType === "verification_rejected"), true);
  assert.equal(signals.some((signal) => signal.signalType === "adoption_suppressed"), true);
});

test("mesh live runtime re-entry on same session after terminal state starts fresh brain state", async () => {
  const runtime = new MeshLiveRuntime();
  const sessionId = "session-reentry-runtime";

  await runtime.processChatUserRequest({
    sessionId,
    requestId: "req-reentry-1",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "first run" },
  });
  const firstSnapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(firstSnapshot);
  if (!firstSnapshot) {
    throw new Error("missing_first_snapshot");
  }
  assert.equal(firstSnapshot.isTerminal, true);

  await runtime.processChatUserRequest({
    sessionId,
    requestId: "req-reentry-2",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "second run" },
  });
  const secondSnapshot = runtime.getSessionBrainSnapshot(sessionId);
  assert.ok(secondSnapshot);
  if (!secondSnapshot) {
    throw new Error("missing_second_snapshot");
  }

  assert.equal(secondSnapshot.cognitiveTransitions[0]?.from, "initializing");
  assert.equal(secondSnapshot.cognitiveTransitions[0]?.to, "understanding");
});

test("runtime guard normalization keeps governance context stable", () => {
  const normalized = normalizeRuntimeGuardContext({
    actionType: "workflow_side_effect",
    requestedOperation: "dispatch",
    safeMode: true,
    ids: { requestId: "req-1" },
  });

  assert.equal(normalized.actionType, "workflow_side_effect");
  assert.equal(normalized.actor, "unknown_actor");
  assert.equal(normalized.safeMode.enabled, true);
  assert.equal(normalized.ids.requestId, "req-1");
  assert.equal(normalized.protectedAction, true);
});

test("runtime guard supports require_audit decision for high-risk requests", () => {
  const guard = new RuntimeGuard();
  const decision = guard.evaluate({
    actionType: "provider_tool_invocation",
    actor: "unit-test",
    source: "test",
    target: "provider-x",
    requestedOperation: "invoke",
    riskHint: "high",
    policyFlags: { requireAuditForHighRisk: true },
    ids: { requestId: "req-audit-1" },
    protectedAction: true,
  });

  assert.equal(decision.outcome, "require_audit");
  assert.equal(decision.requiresAudit, true);
});

test("runtime guard safe mode redirect is enforced before route side effects", async () => {
  class CountingRouter extends MeshRouter {
    public routeCalls = 0;
    override async route(): Promise<MeshRouteResult> {
      this.routeCalls += 1;
      return {
        accepted: true,
        disposition: "allow",
        trustClass: "trusted",
        riskScore: 0.2,
        firstResponseMs: 1,
        asyncJobIds: [],
        reasons: ["counting_router_allowed"],
      };
    }
  }

  const router = new CountingRouter();
  const runtime = new MeshLiveRuntime(undefined, router);
  const result = await runtime.processChatUserRequest({
    sessionId: "runtime-guard-safe-mode",
    requestId: "req-runtime-guard-safe-mode",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "guard this path" },
    metadata: { safeMode: true, forceSafeModeRedirect: true },
  });

  assert.equal(router.routeCalls, 0);
  assert.equal(result.accepted, false);
  assert.equal(result.disposition, "restrict");
  assert.equal(result.reasons.includes("runtime_guard:safe_mode_redirect"), true);
});

test("runtime guard deny fails closed before route dispatch", async () => {
  class CountingRouter extends MeshRouter {
    public routeCalls = 0;
    override async route(): Promise<MeshRouteResult> {
      this.routeCalls += 1;
      return {
        accepted: true,
        disposition: "allow",
        trustClass: "trusted",
        riskScore: 0.2,
        firstResponseMs: 1,
        asyncJobIds: [],
        reasons: ["counting_router_allowed"],
      };
    }
  }

  const router = new CountingRouter();
  const runtime = new MeshLiveRuntime(undefined, router);
  await assert.rejects(
    runtime.processChatUserRequest({
      sessionId: "runtime-guard-deny",
      requestId: "req-runtime-guard-deny",
      routeType: "/api/demo/chat",
      rawInput: { prompt: "deny this path" },
      metadata: { runtimeGuardDeny: true },
    }),
    /runtime_guard_denied/
  );

  assert.equal(router.routeCalls, 0);
});

test("runtime guard degraded allow preserves execution with degraded marker", async () => {
  class CountingRouter extends MeshRouter {
    override async route(): Promise<MeshRouteResult> {
      return {
        accepted: true,
        disposition: "allow",
        trustClass: "trusted",
        riskScore: 0.2,
        firstResponseMs: 1,
        asyncJobIds: [],
        reasons: ["counting_router_allowed"],
      };
    }
  }

  const runtime = new MeshLiveRuntime(undefined, new CountingRouter(), {
    runtimeGuard: new RuntimeGuard(),
  });
  const result = await runtime.processChatUserRequest({
    sessionId: "runtime-guard-degraded",
    requestId: "req-runtime-guard-degraded",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "degrade path" },
    metadata: { runtimeGuardForceDegraded: true },
  });

  assert.equal(result.accepted, true);
  assert.equal(result.reasons.includes("runtime_guard:degraded_allow"), true);
});

test("execution ledger records runtime lifecycle for allow and deny paths", async () => {
  class CountingRouter extends MeshRouter {
    override async route(): Promise<MeshRouteResult> {
      return {
        accepted: true,
        disposition: "allow",
        trustClass: "trusted",
        riskScore: 0.2,
        firstResponseMs: 1,
        asyncJobIds: [],
        reasons: ["counting_router_allowed"],
      };
    }
  }

  const runtime = new MeshLiveRuntime(undefined, new CountingRouter());
  await runtime.processChatUserRequest({
    sessionId: "ledger-allow",
    requestId: "req-ledger-allow",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "hello" },
  });
  await assert.rejects(
    runtime.processChatUserRequest({
      sessionId: "ledger-deny",
      requestId: "req-ledger-deny",
      routeType: "/api/demo/chat",
      rawInput: { prompt: "deny" },
      metadata: { runtimeGuardDeny: true },
    }),
    /runtime_guard_denied/
  );

  const entries = runtime.getExecutionLedgerSnapshot().filter((entry) =>
    entry.ids.requestId === "req-ledger-allow" || entry.ids.requestId === "req-ledger-deny"
  );
  assert.equal(entries.some((entry) => entry.eventType === "execution.started"), true);
  assert.equal(entries.some((entry) => entry.eventType === "runtime.guard.evaluated"), true);
  assert.equal(entries.some((entry) => entry.eventType === "execution.completed"), true);
  assert.equal(entries.some((entry) => entry.eventType === "execution.failed"), true);
});

test("execution ledger captures safe-mode redirected runtime path deterministically", async () => {
  const runtime = new MeshLiveRuntime(undefined, new MeshRouter());
  const result = await runtime.processChatUserRequest({
    sessionId: "ledger-safe-mode",
    requestId: "req-ledger-safe-mode",
    routeType: "/api/demo/chat",
    rawInput: { prompt: "safe redirect" },
    metadata: { safeMode: true, forceSafeModeRedirect: true },
  });
  assert.equal(result.accepted, false);

  const entries = runtime
    .getExecutionLedgerSnapshot()
    .filter((entry) => entry.ids.requestId === "req-ledger-safe-mode");
  assert.equal(entries.some((entry) => entry.mode === "safe_mode_redirect"), true);
  assert.equal(
    entries.some((entry) => entry.eventType === "execution.denied" || entry.eventType === "execution.completed"),
    true
  );
});
