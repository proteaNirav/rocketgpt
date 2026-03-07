import type { CognitiveEvent } from "../types/cognitive-event";
import type { ReasoningPlan, ReasoningPlanner } from "../types/reasoning-trace";
import type { MeshMetrics } from "../metrics/mesh-metrics";
import { SignalFactory } from "../signals/signal-factory";
import { CognitiveSignalPriority } from "../signals/signal-priority";
import { CognitiveSignalType } from "../signals/signal-types";
import type { SignalRouter } from "../signals/signal-router";

interface PlanTemplate {
  category: string;
  selectedProcessingMode: "sync" | "async";
  recommendedNextAction: string;
  confidence: number;
  recalledContextCount: number;
  recallSources: string[];
  recallDispositionSummary: string;
  syncActions: string[];
  asyncActions: string[];
  suggestedAsyncJobs: string[];
}

/**
 * DefaultReasoningPlanner emits a minimal plan shell.
 * Advanced chain-of-thought and adaptive planning are deferred.
 */
export class DefaultReasoningPlanner implements ReasoningPlanner {
  private readonly cache = new Map<string, { value: PlanTemplate; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly signalRouter?: SignalRouter;
  private readonly signalFactory?: SignalFactory;

  constructor(
    private readonly metrics?: MeshMetrics,
    options?: {
      ttlMs?: number;
      maxEntries?: number;
      signalRouter?: SignalRouter;
      signalSourceNode?: string;
    }
  ) {
    this.ttlMs = options?.ttlMs ?? 60_000;
    this.maxEntries = options?.maxEntries ?? 120;
    this.signalRouter = options?.signalRouter;
    this.signalFactory = options?.signalRouter
      ? new SignalFactory({
          nodeId: options.signalSourceNode ?? "reasoning-planner",
          defaultPriority: CognitiveSignalPriority.NORMAL,
        })
      : undefined;
  }

  async plan(
    event: CognitiveEvent,
    contextText: string,
    recall?: {
      count: number;
      sources: string[];
      dispositionSummary: string;
    }
  ): Promise<ReasoningPlan> {
    if (this.signalRouter && this.signalFactory) {
      void this.signalRouter.emit(
        this.signalFactory.create({
          signalType: CognitiveSignalType.REASONING_REQUIRED,
          correlationId: event.requestId ?? event.eventId,
          context: {
            taskId: event.eventId,
            sessionId: event.sessionId,
            nodeId: event.source,
            confidence: event.risk.score >= 0.7 ? 0.4 : 0.75,
            tags: event.tags ?? [],
            metadata: {
              sourceType: event.sourceType,
              routeType: event.routeType,
            },
          },
        })
      );
    }

    const cacheKey = `${event.sourceType}:${event.processingMode}:${event.trustClass}:${event.normalizedInput}:${recall?.count ?? 0}:${recall?.dispositionSummary ?? "none"}`;
    const cached = this.readCache(cacheKey);
    if (cached) {
      this.metrics?.increment("mesh_cache_hit");
      this.metrics?.increment("cache_hit");
      return this.toPlan(event, cached);
    }

    const template = this.buildTemplate(event, contextText, recall);
    this.writeCache(cacheKey, template);
    return this.toPlan(event, template);
  }

  private buildTemplate(
    event: CognitiveEvent,
    contextText: string,
    recall?: {
      count: number;
      sources: string[];
      dispositionSummary: string;
    }
  ): PlanTemplate {
    const category = event.sourceType === "chat.user_text" ? "interactive" : "orchestration";
    const confidence = event.trustClass === "trusted" ? 0.89 : 0.72;
    const recommendedNextAction =
      event.processingMode === "sync" ? "respond_with_existing_contract" : "queue_async_followup";

    return {
      category,
      selectedProcessingMode: event.processingMode,
      recommendedNextAction,
      confidence,
      recalledContextCount: recall?.count ?? 0,
      recallSources: recall?.sources ?? [],
      recallDispositionSummary: recall?.dispositionSummary ?? "none",
      syncActions: ["respond_with_guarded_shell", "record_plan_summary"],
      asyncActions: [
        "deepen-index",
        "summarize-session",
        "recall-compaction",
        "evaluate-learning-candidate",
      ],
      suggestedAsyncJobs: this.resolveAsyncJobs(event, contextText),
    };
  }

  private resolveAsyncJobs(event: CognitiveEvent, contextText: string): string[] {
    const jobs = [
      "deepen-index",
      "summarize-session",
      "recall-compaction",
      "evaluate-learning-candidate",
    ];
    if (event.trustClass === "trusted" && contextText.length > 0) {
      return jobs;
    }
    return jobs.slice(0, 2);
  }

  private toPlan(event: CognitiveEvent, template: PlanTemplate): ReasoningPlan {
    const now = new Date().toISOString();
    return {
      planId: `plan_${event.eventId}`,
      sessionId: event.sessionId,
      eventId: event.eventId,
      category: template.category,
      selectedProcessingMode: template.selectedProcessingMode,
      recommendedNextAction: template.recommendedNextAction,
      confidence: template.confidence,
      recalledContextCount: template.recalledContextCount,
      recallSources: [...template.recallSources],
      recallDispositionSummary: template.recallDispositionSummary,
      syncActions: [...template.syncActions],
      asyncActions: [...template.asyncActions],
      suggestedAsyncJobs: [...template.suggestedAsyncJobs],
      trace: {
        traceId: `trace_${event.eventId}`,
        sessionId: event.sessionId,
        eventId: event.eventId,
        mode: event.processingMode,
        createdAt: now,
        steps: [
          {
            stepId: `step_${event.eventId}_1`,
            kind: "foundation_planner",
            summary: "Generated deterministic sync/async plan template",
            createdAt: now,
          },
        ],
      },
    };
  }

  private readCache(key: string): PlanTemplate | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  private writeCache(key: string, value: PlanTemplate): void {
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}
