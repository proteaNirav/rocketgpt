"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshRouter = void 0;
const cognitive_log_service_1 = require("../logging/cognitive-log-service");
const index_orchestrator_1 = require("../indexing/index-orchestrator");
const working_memory_1 = require("../memory/working-memory");
const memory_retriever_1 = require("../memory/memory-retriever");
const recall_foundation_1 = require("../memory/recall-foundation");
const principal_intake_guard_1 = require("../principal/principal-intake-guard");
const principal_memory_guard_1 = require("../principal/principal-memory-guard");
const categorizer_1 = require("../thinking/categorizer");
const context_builder_1 = require("../thinking/context-builder");
const reasoning_planner_1 = require("../thinking/reasoning-planner");
const cognitive_mesh_job_dispatcher_1 = require("../jobs/cognitive-mesh-job-dispatcher");
const mesh_metrics_1 = require("../metrics/mesh-metrics");
const cognitive_mesh_repository_1 = require("../repositories/cognitive-mesh-repository");
const structural_indexer_1 = require("../indexing/structural-indexer");
class RepositoryLogWriter {
    constructor(repository, onDeferred, onWrite, onFailure) {
        this.repository = repository;
        this.onDeferred = onDeferred;
        this.onWrite = onWrite;
        this.onFailure = onFailure;
    }
    async write(entry) {
        this.onDeferred();
        Promise.resolve()
            .then(() => this.repository.saveLog(entry))
            .then(() => this.onWrite())
            .catch(() => this.onFailure());
    }
}
class RepositoryIndexWriter {
    constructor(repository) {
        this.repository = repository;
    }
    async write(record) {
        await this.repository.saveIndex(record);
    }
}
/**
 * MeshRouter keeps request-path logic bounded and deterministic.
 * Expensive or optional persistence work is deferred.
 */
class MeshRouter {
    constructor(intakeGuard = new principal_intake_guard_1.PrincipalIntakeGuard(), memoryGuard = new principal_memory_guard_1.PrincipalMemoryGuard(), logger, indexer, workingMemory, retriever, categorizer = new categorizer_1.Categorizer(), contextBuilder = new context_builder_1.ContextBuilder(), planner, jobs = new cognitive_mesh_job_dispatcher_1.CognitiveMeshJobDispatcher(), repository, metrics) {
        this.intakeGuard = intakeGuard;
        this.memoryGuard = memoryGuard;
        this.categorizer = categorizer;
        this.contextBuilder = contextBuilder;
        this.jobs = jobs;
        this.metrics = metrics ?? new mesh_metrics_1.MeshMetrics();
        this.repository =
            repository ??
                new cognitive_mesh_repository_1.InProcessCognitiveMeshRepository(process.env.COGNITIVE_MESH_DURABLE_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/live-pipeline.jsonl");
        this.activeLogger =
            logger ??
                new cognitive_log_service_1.CognitiveLogService(new RepositoryLogWriter(this.repository, () => this.metrics.increment("mesh_repository_write_deferred"), () => this.metrics.increment("mesh_repository_write"), () => this.metrics.increment("fallback_rate")));
        this.activeIndexer =
            indexer ??
                new index_orchestrator_1.IndexOrchestrator(new structural_indexer_1.StructuralIndexer(), new RepositoryIndexWriter(this.repository));
        this.activeWorkingMemory = workingMemory ?? new working_memory_1.WorkingMemory();
        this.activeRetriever = retriever ?? new memory_retriever_1.MemoryRetriever([this.activeWorkingMemory]);
        this.activeRecall = new recall_foundation_1.RecallFoundation(this.repository);
        this.activePlanner = planner ?? new reasoning_planner_1.DefaultReasoningPlanner(this.metrics);
    }
    async route(event) {
        const started = Date.now();
        this.metrics.increment("mesh_event_received");
        try {
            await this.persistSync(() => this.repository.saveEvent(event));
            await this.logDeferred({
                event,
                message: "mesh_event_received",
                details: { sourceType: event.sourceType, routeType: event.routeType ?? null },
            });
            const guard = await this.intakeGuard.evaluate(event);
            event.trustClass = guard.trustClass;
            event.risk = guard.risk;
            await this.logDeferred({
                event,
                message: "mesh_intake_evaluated",
                details: {
                    disposition: guard.disposition,
                    trustClass: guard.trustClass,
                    riskScore: guard.risk.score,
                    reasons: guard.reasons,
                },
            });
            if (!guard.allowed) {
                this.metrics.increment(guard.disposition === "block" ? "mesh_intake_blocked" : "mesh_intake_restricted");
                if (guard.disposition === "block" || guard.disposition === "quarantine") {
                    const quarantineJob = await this.jobs.dispatch(event, "quarantine-review", {
                        candidate: {
                            reason: guard.reasons.join(","),
                            trustClass: guard.trustClass,
                        },
                    });
                    this.persistDeferred(() => this.repository.saveAsyncTask({
                        taskId: quarantineJob.jobId,
                        eventId: quarantineJob.eventId,
                        sessionId: quarantineJob.sessionId,
                        kind: quarantineJob.kind,
                        payload: quarantineJob.payload,
                        queuedAt: quarantineJob.queuedAt,
                    }));
                }
                const firstResponseMs = Date.now() - started;
                this.metrics.observeLatency("first_response_ms", firstResponseMs);
                return {
                    accepted: false,
                    disposition: guard.disposition,
                    trustClass: guard.trustClass,
                    riskScore: guard.risk.score,
                    firstResponseMs,
                    asyncJobIds: [],
                    reasons: guard.reasons,
                };
            }
            this.metrics.increment("mesh_intake_allowed");
            event.tags = this.categorizer.categorize(event);
            await this.logDeferred({
                event,
                message: "mesh_routing_start",
                details: { tags: event.tags, mode: event.processingMode },
            });
            await this.persistSync(() => this.activeIndexer.index(event));
            const writeDecision = await this.memoryGuard.evaluateWrite(event);
            if (writeDecision.allowed) {
                const workingRecord = {
                    id: `mem_${event.eventId}`,
                    sessionId: event.sessionId,
                    tier: "working",
                    content: event.normalizedInput,
                    confidence: 0.5,
                    sourceEventId: event.eventId,
                    createdAt: new Date().toISOString(),
                    metadata: {
                        requestId: event.requestId,
                        routeType: event.routeType,
                        sourceType: event.sourceType,
                    },
                };
                await this.activeWorkingMemory.put(workingRecord);
                this.persistDeferred(() => this.repository.saveMemoryItem(workingRecord));
                this.metrics.increment("mesh_working_memory_write");
                await this.logDeferred({
                    event,
                    message: "mesh_working_memory_write",
                    details: { memoryId: workingRecord.id },
                });
            }
            let recallItems = [];
            let recallSources = [];
            let recallDispositionSummary = "none";
            this.metrics.increment("mesh_recall_attempted");
            const recallDecision = await this.memoryGuard.evaluateRecall(event);
            try {
                const working = await this.activeRetriever.retrieve({ sessionId: event.sessionId, limit: 8 }, event);
                const recall = await this.activeRecall.recall(event, recallDecision, working, {
                    maxItems: 8,
                    maxChars: 2400,
                });
                recallItems = recall.items.map((item) => ({
                    id: item.id,
                    sessionId: event.sessionId,
                    tier: "working",
                    content: item.content,
                    confidence: 0.5,
                    sourceEventId: event.eventId,
                    createdAt: new Date().toISOString(),
                    metadata: { recallSource: item.source },
                }));
                recallSources = recall.sources;
                recallDispositionSummary = recall.dispositionSummary;
                if (recall.items.length > 0) {
                    this.metrics.increment("mesh_recall_hit");
                }
                if (recall.filteredCount > 0) {
                    this.metrics.increment("mesh_recall_filtered", recall.filteredCount);
                }
            }
            catch {
                this.metrics.increment("fallback_rate");
            }
            const context = this.contextBuilder.build(event, recallItems);
            const planStarted = Date.now();
            const plan = await this.activePlanner.plan(event, context, {
                count: recallItems.length,
                sources: recallSources,
                dispositionSummary: recallDispositionSummary,
            });
            if (plan.recalledContextCount > 0) {
                this.metrics.increment("mesh_reasoning_plan_enriched");
            }
            const planLatency = Date.now() - planStarted;
            this.metrics.observeLatency("plan_latency_ms", planLatency);
            this.metrics.increment("mesh_reasoning_plan_created");
            this.persistDeferred(() => this.persistReasoningPlan(plan));
            await this.logDeferred({
                event,
                message: "mesh_reasoning_plan_generated",
                details: {
                    planId: plan.planId,
                    category: plan.category,
                    selectedProcessingMode: plan.selectedProcessingMode,
                    confidence: plan.confidence,
                    recalledContextCount: plan.recalledContextCount,
                },
            });
            const asyncKinds = plan.suggestedAsyncJobs;
            const asyncJobs = await Promise.all(asyncKinds.map((kind) => this.jobs.dispatch(event, kind, this.buildAsyncPayload(kind, event, plan))));
            asyncJobs.forEach((job) => {
                this.persistDeferred(() => this.repository.saveAsyncTask({
                    taskId: job.jobId,
                    eventId: job.eventId,
                    sessionId: job.sessionId,
                    kind: job.kind,
                    payload: job.payload,
                    queuedAt: job.queuedAt,
                }));
            });
            if (asyncJobs.length > 0) {
                this.metrics.increment("mesh_async_dispatch_queued", asyncJobs.length);
                await this.logDeferred({
                    event,
                    message: "mesh_async_dispatch_queued",
                    details: { jobIds: asyncJobs.map((job) => job.jobId) },
                });
            }
            const firstResponseMs = Date.now() - started;
            this.metrics.observeLatency("first_response_ms", firstResponseMs);
            return {
                accepted: true,
                disposition: guard.disposition,
                trustClass: guard.trustClass,
                riskScore: guard.risk.score,
                firstResponseMs,
                syncPlanId: plan.planId,
                asyncJobIds: asyncJobs.map((job) => job.jobId),
                reasons: ["accepted_by_mesh_router"],
            };
        }
        catch {
            this.metrics.increment("fallback_rate");
            const firstResponseMs = Date.now() - started;
            this.metrics.observeLatency("first_response_ms", firstResponseMs);
            return {
                accepted: false,
                disposition: "restrict",
                trustClass: event.trustClass,
                riskScore: event.risk.score,
                firstResponseMs,
                asyncJobIds: [],
                reasons: ["mesh_router_failure_isolated"],
            };
        }
    }
    getMetricsSnapshot() {
        return this.metrics.snapshot();
    }
    getRepositorySnapshot() {
        return this.repository.snapshot();
    }
    incrementMetric(name, by = 1) {
        this.metrics.increment(name, by);
    }
    async persistReasoningPlan(plan) {
        await this.repository.saveReasoningPlan(plan);
    }
    async persistSync(action) {
        try {
            await action();
            this.metrics.increment("mesh_repository_write");
        }
        catch {
            this.metrics.increment("fallback_rate");
        }
    }
    persistDeferred(action) {
        this.metrics.increment("mesh_repository_write_deferred");
        Promise.resolve()
            .then(() => action())
            .then(() => this.metrics.increment("mesh_repository_write"))
            .catch(() => this.metrics.increment("fallback_rate"));
    }
    async logDeferred(ctx) {
        try {
            await this.activeLogger.log(ctx);
        }
        catch {
            this.metrics.increment("fallback_rate");
        }
    }
    buildAsyncPayload(kind, event, plan) {
        if (kind === "summarize-session") {
            return {
                planId: plan.planId,
                candidate: {
                    type: "session-summary",
                    sessionId: event.sessionId,
                    routeType: event.routeType,
                },
            };
        }
        if (kind === "recall-compaction") {
            return {
                planId: plan.planId,
                candidate: {
                    type: "recall-compaction",
                    sessionId: event.sessionId,
                    maxItems: 20,
                },
            };
        }
        if (kind === "evaluate-learning-candidate") {
            return {
                planId: plan.planId,
                candidate: {
                    type: "learning-evaluation",
                    trustClass: event.trustClass,
                    sourceType: event.sourceType,
                },
            };
        }
        if (kind === "quarantine-review") {
            return {
                planId: plan.planId,
                candidate: {
                    type: "quarantine-review",
                    trustClass: event.trustClass,
                },
            };
        }
        return {
            planId: plan.planId,
            candidate: {
                type: "deepen-index",
                sourceType: event.sourceType,
            },
        };
    }
}
exports.MeshRouter = MeshRouter;
