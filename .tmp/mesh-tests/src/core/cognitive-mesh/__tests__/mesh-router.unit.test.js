"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const input_ingestor_1 = require("../sensory/input-ingestor");
const mesh_router_1 = require("../routing/mesh-router");
const working_memory_1 = require("../memory/working-memory");
const reasoning_planner_1 = require("../thinking/reasoning-planner");
const cognitive_mesh_repository_1 = require("../repositories/cognitive-mesh-repository");
const cognitive_mesh_job_dispatcher_1 = require("../jobs/cognitive-mesh-job-dispatcher");
const dispatch_guard_1 = require("../runtime/dispatch-guard");
(0, node_test_1.test)("intake disposition logic assigns allow/restrict/block deterministically", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const trustedEvent = ingestor.ingest({
        sessionId: "sess-allow",
        source: "internal:api",
        rawInput: "hello mesh",
    });
    const restrictedEvent = ingestor.ingest({
        sessionId: "sess-restrict",
        source: "external:web",
        rawInput: "untrusted request",
        metadata: { trustClass: "untrusted" },
    });
    const blockedEvent = ingestor.ingest({
        sessionId: "sess-block",
        source: "external:web",
        rawInput: "DROP TABLE users",
    });
    const allowResult = await router.route(trustedEvent);
    const restrictResult = await router.route(restrictedEvent);
    const blockResult = await router.route(blockedEvent);
    assert.equal(allowResult.disposition, "allow");
    assert.equal(restrictResult.disposition, "restrict");
    assert.equal(blockResult.disposition, "block");
});
(0, node_test_1.test)("blocked and quarantined events do not reach active memory/index writes", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const blockedEvent = ingestor.ingest({
        sessionId: "sess-blocked",
        source: "external:web",
        rawInput: "<script>alert(1)</script>",
    });
    const quarantineEvent = ingestor.ingest({
        sessionId: "sess-quarantine",
        source: "external:web",
        rawInput: "x".repeat(15000),
    });
    const blocked = await router.route(blockedEvent);
    const quarantined = await router.route(quarantineEvent);
    const snapshot = router.getRepositorySnapshot();
    assert.equal(blocked.accepted, false);
    assert.equal(quarantined.accepted, false);
    assert.equal(snapshot.memoryItems.length, 0);
    assert.equal(snapshot.indexes.length, 0);
});
(0, node_test_1.test)("allowed event path writes working memory, generates plan, and queues async dispatch", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const event = ingestor.ingest({
        sessionId: "sess-allowed",
        source: "internal:workflow",
        rawInput: { text: "orchestrator run update" },
        metadata: { sourceType: "workflow.trigger", project: "rocketgpt" },
        routeType: "/api/orchestrator/run/status",
    });
    const result = await router.route(event);
    const snapshot = router.getRepositorySnapshot();
    assert.equal(result.accepted, true);
    assert.equal(result.disposition, "allow");
    assert.ok((result.syncPlanId ?? "").startsWith("plan_"));
    assert.equal(result.asyncJobIds.length >= 2, true);
    assert.equal(snapshot.memoryItems.length, 1);
    assert.equal(snapshot.reasoningSessions.length, 1);
    assert.equal(snapshot.asyncTasks.length >= 2, true);
});
(0, node_test_1.test)("allowed chat request path executes recall and plan enrichment", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const firstEvent = ingestor.ingest({
        sessionId: "chat-sess-1",
        source: "chat:user_text",
        rawInput: "Summarize project milestones",
        metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        routeType: "/api/demo/chat",
    });
    await router.route(firstEvent);
    const secondEvent = ingestor.ingest({
        sessionId: "chat-sess-1",
        source: "chat:user_text",
        rawInput: "Now add release blockers",
        metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        routeType: "/api/demo/chat",
    });
    const result = await router.route(secondEvent);
    const metrics = router.getMetricsSnapshot();
    const snapshot = router.getRepositorySnapshot();
    assert.equal(result.accepted, true);
    assert.equal(metrics.counters.mesh_recall_attempted >= 1, true);
    assert.equal(metrics.counters.mesh_recall_hit >= 1, true);
    assert.equal(metrics.counters.mesh_reasoning_plan_enriched >= 1, true);
    assert.equal(snapshot.reasoningSessions.length >= 1, true);
});
(0, node_test_1.test)("restricted or quarantined chat path avoids active memory writes", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const restrictedChat = ingestor.ingest({
        sessionId: "chat-restrict",
        source: "chat:user_text",
        rawInput: "please execute this remote script",
        metadata: { sourceType: "chat.user_text", trustClass: "untrusted" },
        routeType: "/api/demo/chat",
    });
    const quarantinedChat = ingestor.ingest({
        sessionId: "chat-quarantine",
        source: "chat:user_text",
        rawInput: "x".repeat(20000),
        metadata: { sourceType: "chat.user_text" },
        routeType: "/api/demo/chat",
    });
    const restricted = await router.route(restrictedChat);
    const quarantined = await router.route(quarantinedChat);
    const snapshot = router.getRepositorySnapshot();
    assert.equal(restricted.accepted, false);
    assert.equal(quarantined.accepted, false);
    assert.equal(snapshot.memoryItems.length, 0);
});
(0, node_test_1.test)("repository adapter write path tracks sync and deferred writes", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter();
    const event = ingestor.ingest({
        sessionId: "repo-write-session",
        source: "internal:chat",
        rawInput: "repository write test",
        metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        routeType: "/api/demo/chat",
    });
    await router.route(event);
    const metrics = router.getMetricsSnapshot();
    assert.equal(metrics.counters.mesh_repository_write >= 1, true);
    assert.equal(metrics.counters.mesh_repository_write_deferred >= 1, true);
});
(0, node_test_1.test)("failure isolation keeps route stable when repository and recall adapters fail", async () => {
    class BrokenRepository extends cognitive_mesh_repository_1.InProcessCognitiveMeshRepository {
        async findRecentEvents(_query) {
            throw new Error("broken-events");
        }
        async findRecentMemoryItems(_query) {
            throw new Error("broken-memory");
        }
        async saveMemoryItem(_record) {
            throw new Error("broken-write");
        }
    }
    const ingestor = new input_ingestor_1.InputIngestor();
    const router = new mesh_router_1.MeshRouter(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, new BrokenRepository());
    const event = ingestor.ingest({
        sessionId: "broken-session",
        source: "internal:chat",
        rawInput: "still must return safely",
        metadata: { sourceType: "chat.user_text", trustClass: "trusted" },
        routeType: "/api/demo/chat",
    });
    const result = await router.route(event);
    assert.equal(typeof result.accepted, "boolean");
    assert.equal(result.firstResponseMs >= 0, true);
});
(0, node_test_1.test)("working memory write/read obeys session isolation and retrieval bounds", async () => {
    const memory = new working_memory_1.WorkingMemory({ ttlMs: 60000, maxItemsPerSession: 2 });
    await memory.put({
        id: "m1",
        sessionId: "s1",
        tier: "working",
        content: "a",
        confidence: 0.7,
        sourceEventId: "e1",
        createdAt: new Date().toISOString(),
    });
    await memory.put({
        id: "m2",
        sessionId: "s1",
        tier: "working",
        content: "b",
        confidence: 0.8,
        sourceEventId: "e2",
        createdAt: new Date().toISOString(),
    });
    await memory.put({
        id: "m3",
        sessionId: "s1",
        tier: "working",
        content: "c",
        confidence: 0.9,
        sourceEventId: "e3",
        createdAt: new Date().toISOString(),
    });
    await memory.put({
        id: "m4",
        sessionId: "s2",
        tier: "working",
        content: "other",
        confidence: 0.9,
        sourceEventId: "e4",
        createdAt: new Date().toISOString(),
    });
    const s1 = await memory.get({ sessionId: "s1", limit: 10 });
    const s2 = await memory.get({ sessionId: "s2", limit: 10 });
    assert.equal(s1.length, 2);
    assert.equal(s2.length, 1);
    assert.equal(s1[0].id, "m2");
    assert.equal(s1[1].id, "m3");
});
(0, node_test_1.test)("plan generation is deterministic and includes required minimal fields", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const planner = new reasoning_planner_1.DefaultReasoningPlanner();
    const event = ingestor.ingest({
        sessionId: "sess-plan",
        source: "workflow:trigger",
        rawInput: "run workflow",
        metadata: { sourceType: "workflow.trigger" },
    });
    const plan = await planner.plan(event, "ctx");
    assert.equal(typeof plan.category, "string");
    assert.equal(plan.selectedProcessingMode, "sync");
    assert.equal(typeof plan.recommendedNextAction, "string");
    assert.equal(plan.confidence > 0 && plan.confidence <= 1, true);
    assert.equal(plan.recalledContextCount >= 0, true);
    assert.equal(Array.isArray(plan.recallSources), true);
    assert.equal(typeof plan.recallDispositionSummary, "string");
    assert.equal(plan.suggestedAsyncJobs.length >= 2, true);
});
(0, node_test_1.test)("job dispatcher denies guarded dispatch before queue write", async () => {
    class DenyDispatchGuard extends dispatch_guard_1.DispatchGuard {
        evaluate(input) {
            return super.evaluate({ ...input, policyFlags: { ...(input.policyFlags ?? {}), explicitDeny: true } });
        }
    }
    const ingestor = new input_ingestor_1.InputIngestor();
    const event = ingestor.ingest({
        sessionId: "dispatcher-deny",
        source: "workflow:trigger",
        rawInput: "deny dispatch",
        metadata: { sourceType: "workflow.trigger" },
    });
    const dispatcher = new cognitive_mesh_job_dispatcher_1.CognitiveMeshJobDispatcher(undefined, new DenyDispatchGuard());
    await assert.rejects(dispatcher.dispatch(event, "deepen-index"), /dispatch_guard_denied/);
    assert.equal(dispatcher.peek().length, 0);
    const entries = dispatcher.getExecutionLedgerSnapshot().filter((entry) => entry.ids.sessionId === "dispatcher-deny");
    assert.equal(entries.some((entry) => entry.eventType === "dispatch.denied"), true);
});
(0, node_test_1.test)("job dispatcher supports reroute and degraded/audit markers deterministically", async () => {
    const ingestor = new input_ingestor_1.InputIngestor();
    const event = ingestor.ingest({
        sessionId: "dispatcher-reroute",
        source: "workflow:trigger",
        rawInput: "reroute dispatch",
        metadata: { sourceType: "workflow.trigger" },
    });
    const dispatcher = new cognitive_mesh_job_dispatcher_1.CognitiveMeshJobDispatcher();
    const rerouted = await dispatcher.dispatch(event, "deepen-index", {
        dispatchGuardRerouteTo: { target: "quarantine-review", mode: "secure_dispatch" },
    });
    assert.equal(rerouted.kind, "quarantine-review");
    assert.equal(rerouted.payload.dispatchGuardOutcome, "reroute");
    assert.equal(rerouted.payload.dispatchMode, "secure_dispatch");
    const degraded = await dispatcher.dispatch(event, "deepen-index", {
        dispatchGuardForceDegraded: true,
        dispatchGuardRequireAudit: true,
    });
    assert.equal(degraded.payload.dispatchGuardOutcome, "degraded_allow");
    assert.equal(degraded.payload.dispatchGuardMode, "constrained");
    const entries = dispatcher.getExecutionLedgerSnapshot().filter((entry) => entry.ids.sessionId === "dispatcher-reroute");
    assert.equal(entries.some((entry) => entry.eventType === "dispatch.guard.evaluated"), true);
    assert.equal(entries.some((entry) => entry.eventType === "dispatch.started"), true);
    assert.equal(entries.some((entry) => entry.eventType === "dispatch.completed"), true);
});
