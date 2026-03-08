"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshRouter = void 0;
const cognitive_log_service_1 = require("../logging/cognitive-log-service");
const index_orchestrator_1 = require("../indexing/index-orchestrator");
const working_memory_1 = require("../memory/working-memory");
const memory_retriever_1 = require("../memory/memory-retriever");
const principal_intake_guard_1 = require("../principal/principal-intake-guard");
const principal_memory_guard_1 = require("../principal/principal-memory-guard");
const categorizer_1 = require("../thinking/categorizer");
const context_builder_1 = require("../thinking/context-builder");
const reasoning_planner_1 = require("../thinking/reasoning-planner");
const cognitive_mesh_job_dispatcher_1 = require("../jobs/cognitive-mesh-job-dispatcher");
/**
 * MeshRouter keeps request-path logic bounded and deterministic.
 * Expensive work is intentionally pushed to async job dispatch.
 */
class MeshRouter {
    constructor(intakeGuard = new principal_intake_guard_1.PrincipalIntakeGuard(), memoryGuard = new principal_memory_guard_1.PrincipalMemoryGuard(), logger = new cognitive_log_service_1.CognitiveLogService(), indexer = new index_orchestrator_1.IndexOrchestrator(), workingMemory, retriever, categorizer = new categorizer_1.Categorizer(), contextBuilder = new context_builder_1.ContextBuilder(), planner = new reasoning_planner_1.DefaultReasoningPlanner(), jobs = new cognitive_mesh_job_dispatcher_1.CognitiveMeshJobDispatcher()) {
        this.intakeGuard = intakeGuard;
        this.memoryGuard = memoryGuard;
        this.logger = logger;
        this.indexer = indexer;
        this.categorizer = categorizer;
        this.contextBuilder = contextBuilder;
        this.planner = planner;
        this.jobs = jobs;
        this.activeWorkingMemory = workingMemory ?? new working_memory_1.WorkingMemory();
        this.activeRetriever = retriever ?? new memory_retriever_1.MemoryRetriever([this.activeWorkingMemory]);
    }
    async route(event) {
        const started = Date.now();
        const guard = await this.intakeGuard.evaluate(event);
        if (!guard.allowed) {
            await this.logger.log({
                event,
                level: "warn",
                message: "cognitive_event_rejected",
                details: { reasons: guard.reasons, trustClass: guard.trustClass },
            });
            return {
                accepted: false,
                firstResponseMs: Date.now() - started,
                asyncJobIds: [],
                reasons: guard.reasons,
            };
        }
        event.tags = this.categorizer.categorize(event);
        await this.logger.log({
            event,
            message: "cognitive_event_received",
            details: { tags: event.tags, mode: event.processingMode },
        });
        await this.indexer.index(event);
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
            };
            await this.activeWorkingMemory.put(workingRecord);
        }
        const recalled = await this.activeRetriever.retrieve({ sessionId: event.sessionId, limit: 10 }, event);
        const context = this.contextBuilder.build(event, recalled);
        const plan = await this.planner.plan(event, context);
        // Async-only tasks are job-dispatched to keep first response fast.
        const learningJob = await this.jobs.dispatch(event, "learning");
        const archiveJob = await this.jobs.dispatch(event, "archive");
        return {
            accepted: true,
            firstResponseMs: Date.now() - started,
            syncPlanId: plan.planId,
            asyncJobIds: [learningJob.jobId, archiveJob.jobId],
            reasons: ["accepted_by_mesh_router"],
        };
    }
}
exports.MeshRouter = MeshRouter;
