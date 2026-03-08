import { CognitiveLogService } from "../logging/cognitive-log-service";
import { IndexOrchestrator } from "../indexing/index-orchestrator";
import { WorkingMemory } from "../memory/working-memory";
import { MemoryRetriever } from "../memory/memory-retriever";
import { RecallFoundation } from "../memory/recall-foundation";
import { PrincipalIntakeGuard } from "../principal/principal-intake-guard";
import { PrincipalMemoryGuard } from "../principal/principal-memory-guard";
import { Categorizer } from "../thinking/categorizer";
import { ContextBuilder } from "../thinking/context-builder";
import { DefaultReasoningPlanner } from "../thinking/reasoning-planner";
import {
  CognitiveMeshJobDispatcher,
  type CognitiveMeshTaskKind,
} from "../jobs/cognitive-mesh-job-dispatcher";
import type { CognitiveEvent, CognitiveMeshMetricName } from "../types/cognitive-event";
import type { CognitiveLogContext, IndexRecord, LogEntry, LogWriter } from "../types/index-record";
import type { MemoryRecord } from "../types/memory-record";
import type { ReasoningPlan } from "../types/reasoning-trace";
import { MeshMetrics } from "../metrics/mesh-metrics";
import {
  InProcessCognitiveMeshRepository,
  type CognitiveMeshRepository,
} from "../repositories/cognitive-mesh-repository";
import { StructuralIndexer } from "../indexing/structural-indexer";
import type { IndexWriter } from "../types/index-record";

export interface MeshRouteResult {
  accepted: boolean;
  disposition: "allow" | "restrict" | "quarantine" | "block";
  trustClass: CognitiveEvent["trustClass"];
  riskScore: number;
  firstResponseMs: number;
  syncPlanId?: string;
  asyncJobIds: string[];
  reasons: string[];
}

class RepositoryLogWriter implements LogWriter {
  constructor(
    private readonly repository: CognitiveMeshRepository,
    private readonly onDeferred: () => void,
    private readonly onWrite: () => void,
    private readonly onFailure: () => void
  ) {}

  async write(entry: LogEntry): Promise<void> {
    this.onDeferred();
    Promise.resolve()
      .then(() => this.repository.saveLog(entry))
      .then(() => this.onWrite())
      .catch(() => this.onFailure());
  }
}

class RepositoryIndexWriter implements IndexWriter {
  constructor(private readonly repository: CognitiveMeshRepository) {}

  async write(record: IndexRecord): Promise<void> {
    await this.repository.saveIndex(record);
  }
}

/**
 * MeshRouter keeps request-path logic bounded and deterministic.
 * Expensive or optional persistence work is deferred.
 */
export class MeshRouter {
  private readonly activeWorkingMemory: WorkingMemory;
  private readonly activeRetriever: MemoryRetriever;
  private readonly activeRecall: RecallFoundation;
  private readonly metrics: MeshMetrics;
  private readonly repository: InProcessCognitiveMeshRepository;
  private readonly activeLogger: CognitiveLogService;
  private readonly activeIndexer: IndexOrchestrator;
  private readonly activePlanner: DefaultReasoningPlanner;

  constructor(
    private readonly intakeGuard = new PrincipalIntakeGuard(),
    private readonly memoryGuard = new PrincipalMemoryGuard(),
    logger?: CognitiveLogService,
    indexer?: IndexOrchestrator,
    workingMemory?: WorkingMemory,
    retriever?: MemoryRetriever,
    private readonly categorizer = new Categorizer(),
    private readonly contextBuilder = new ContextBuilder(),
    planner?: DefaultReasoningPlanner,
    private readonly jobs = new CognitiveMeshJobDispatcher(),
    repository?: InProcessCognitiveMeshRepository,
    metrics?: MeshMetrics
  ) {
    this.metrics = metrics ?? new MeshMetrics();
    this.repository =
      repository ??
      new InProcessCognitiveMeshRepository(
        process.env.COGNITIVE_MESH_DURABLE_JSONL_PATH ?? ".rocketgpt/cognitive-mesh/live-pipeline.jsonl"
      );
    this.activeLogger =
      logger ??
      new CognitiveLogService(
        new RepositoryLogWriter(
          this.repository,
          () => this.metrics.increment("mesh_repository_write_deferred"),
          () => this.metrics.increment("mesh_repository_write"),
          () => this.metrics.increment("fallback_rate")
        )
      );
    this.activeIndexer =
      indexer ??
      new IndexOrchestrator(new StructuralIndexer(), new RepositoryIndexWriter(this.repository));
    this.activeWorkingMemory = workingMemory ?? new WorkingMemory();
    this.activeRetriever = retriever ?? new MemoryRetriever([this.activeWorkingMemory]);
    this.activeRecall = new RecallFoundation(this.repository);
    this.activePlanner = planner ?? new DefaultReasoningPlanner(this.metrics);
  }

  async route(event: CognitiveEvent): Promise<MeshRouteResult> {
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
          this.persistDeferred(() =>
            this.repository.saveAsyncTask({
              taskId: quarantineJob.jobId,
              eventId: quarantineJob.eventId,
              sessionId: quarantineJob.sessionId,
              kind: quarantineJob.kind,
              payload: quarantineJob.payload,
              queuedAt: quarantineJob.queuedAt,
            })
          );
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
        const workingRecord: MemoryRecord = {
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

      let recallItems: MemoryRecord[] = [];
      let recallSources: string[] = [];
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
      } catch {
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

      const asyncKinds = plan.suggestedAsyncJobs as CognitiveMeshTaskKind[];
      const asyncJobs = await Promise.all(
        asyncKinds.map((kind) => this.jobs.dispatch(event, kind, this.buildAsyncPayload(kind, event, plan)))
      );
      asyncJobs.forEach((job) => {
        this.persistDeferred(() =>
          this.repository.saveAsyncTask({
            taskId: job.jobId,
            eventId: job.eventId,
            sessionId: job.sessionId,
            kind: job.kind,
            payload: job.payload,
            queuedAt: job.queuedAt,
          })
        );
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
    } catch {
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

  getMetricsSnapshot(): ReturnType<MeshMetrics["snapshot"]> {
    return this.metrics.snapshot();
  }

  getRepositorySnapshot() {
    return this.repository.snapshot();
  }

  incrementMetric(name: CognitiveMeshMetricName, by = 1): void {
    this.metrics.increment(name, by);
  }

  private async persistReasoningPlan(plan: ReasoningPlan): Promise<void> {
    await this.repository.saveReasoningPlan(plan);
  }

  private async persistSync(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      this.metrics.increment("mesh_repository_write");
    } catch {
      this.metrics.increment("fallback_rate");
    }
  }

  private persistDeferred(action: () => Promise<unknown>): void {
    this.metrics.increment("mesh_repository_write_deferred");
    Promise.resolve()
      .then(() => action())
      .then(() => this.metrics.increment("mesh_repository_write"))
      .catch(() => this.metrics.increment("fallback_rate"));
  }

  private async logDeferred(ctx: CognitiveLogContext): Promise<void> {
    try {
      await this.activeLogger.log(ctx);
    } catch {
      this.metrics.increment("fallback_rate");
    }
  }

  private buildAsyncPayload(
    kind: CognitiveMeshTaskKind,
    event: CognitiveEvent,
    plan: ReasoningPlan
  ): Record<string, unknown> {
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
