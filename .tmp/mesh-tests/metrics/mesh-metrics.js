"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeshMetrics = void 0;
const REQUIRED_KEYS = [
    "plan_latency_ms",
    "first_response_ms",
    "cache_hit",
    "deep_mode_rate",
    "timeout_rate",
    "fallback_rate",
    "improvise_rate",
    "mesh_event_received",
    "mesh_intake_allowed",
    "mesh_intake_restricted",
    "mesh_intake_blocked",
    "mesh_working_memory_write",
    "mesh_reasoning_plan_created",
    "mesh_async_dispatch_queued",
    "mesh_cache_hit",
    "mesh_chat_hook_invoked",
    "mesh_recall_attempted",
    "mesh_recall_hit",
    "mesh_recall_filtered",
    "mesh_repository_write",
    "mesh_repository_write_deferred",
    "mesh_reasoning_plan_enriched",
];
class MeshMetrics {
    constructor() {
        this.timingsMs = {};
        this.counters = REQUIRED_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
    }
    increment(name, by = 1) {
        this.counters[name] = (this.counters[name] ?? 0) + by;
    }
    observeLatency(name, valueMs) {
        const bucket = this.timingsMs[name] ?? [];
        bucket.push(valueMs);
        this.timingsMs[name] = bucket.slice(-200);
        this.increment(name);
    }
    snapshot() {
        return {
            counters: { ...this.counters },
            timingsMs: {
                plan_latency_ms: [...(this.timingsMs.plan_latency_ms ?? [])],
                first_response_ms: [...(this.timingsMs.first_response_ms ?? [])],
            },
        };
    }
}
exports.MeshMetrics = MeshMetrics;
