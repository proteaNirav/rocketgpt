"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultReasoningPlanner = void 0;
/**
 * DefaultReasoningPlanner emits a minimal plan shell.
 * Advanced chain-of-thought and adaptive planning are deferred.
 */
class DefaultReasoningPlanner {
    constructor(metrics, options) {
        this.metrics = metrics;
        this.cache = new Map();
        this.ttlMs = options?.ttlMs ?? 60000;
        this.maxEntries = options?.maxEntries ?? 120;
    }
    async plan(event, contextText, recall) {
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
    buildTemplate(event, contextText, recall) {
        const category = event.sourceType === "chat.user_text" ? "interactive" : "orchestration";
        const confidence = event.trustClass === "trusted" ? 0.89 : 0.72;
        const recommendedNextAction = event.processingMode === "sync" ? "respond_with_existing_contract" : "queue_async_followup";
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
    resolveAsyncJobs(event, contextText) {
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
    toPlan(event, template) {
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
    readCache(key) {
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
    writeCache(key, value) {
        if (this.cache.size >= this.maxEntries) {
            const oldest = this.cache.keys().next().value;
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
exports.DefaultReasoningPlanner = DefaultReasoningPlanner;
