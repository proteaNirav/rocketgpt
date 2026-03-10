/**
 * Cognitive Mesh V1 foundation contracts.
 * These types are stable extension points for future intelligence layers.
 */

export type TrustClass =
  | "trusted"
  | "restricted"
  | "untrusted"
  | "quarantined"
  | "evidence_only"
  | "blocked";

export type MemoryTier =
  | "sensory"
  | "working"
  | "episodic"
  | "semantic"
  | "procedural"
  | "archive";

export type ProcessingMode = "sync" | "async";
export type CognitiveSourceType =
  | "chat.user_text"
  | "workflow.trigger"
  | "cats.task_execution"
  | "unknown";
export type IntakeDisposition = "allow" | "restrict" | "quarantine" | "block";

export type LearningDisposition = "promote" | "retain" | "archive" | "reject";

export type RecallDisposition = "allow" | "allow_low_confidence" | "restrict" | "exclude";

export interface RiskScore {
  score: number;
  reasons: string[];
  evaluatedAt: string;
}

export interface CognitiveEvent {
  eventId: string;
  sessionId: string;
  requestId?: string;
  occurredAt: string;
  source: string;
  sourceType: CognitiveSourceType;
  routeType?: string;
  processingMode: ProcessingMode;
  trustClass: TrustClass;
  risk: RiskScore;
  rawInput: unknown;
  normalizedInput: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export type CognitiveMeshMetricName =
  | "plan_latency_ms"
  | "first_response_ms"
  | "cache_hit"
  | "deep_mode_rate"
  | "timeout_rate"
  | "fallback_rate"
  | "improvise_rate"
  | "mesh_event_received"
  | "mesh_intake_allowed"
  | "mesh_intake_restricted"
  | "mesh_intake_blocked"
  | "mesh_working_memory_write"
  | "mesh_reasoning_plan_created"
  | "mesh_async_dispatch_queued"
  | "mesh_cache_hit"
  | "mesh_chat_hook_invoked"
  | "mesh_recall_attempted"
  | "mesh_recall_hit"
  | "mesh_recall_filtered"
  | "mesh_repository_write"
  | "mesh_repository_write_deferred"
  | "mesh_reasoning_plan_enriched"
  | "mesh_signal_observed"
  | "mesh_signal_dropped"
  | "mesh_attention_evaluated"
  | "mesh_priority_recalculated";

export interface GuardDecision {
  allowed: boolean;
  disposition: IntakeDisposition;
  trustClass: TrustClass;
  risk: RiskScore;
  reasons: string[];
}

export interface RecallDecision {
  disposition: RecallDisposition;
  reasons: string[];
}

export interface LearningDecision {
  disposition: LearningDisposition;
  reasons: string[];
}

export interface IntakeGuard {
  evaluate(event: CognitiveEvent): Promise<GuardDecision>;
}

export interface MemoryGuard {
  evaluateWrite(event: CognitiveEvent): Promise<GuardDecision>;
  evaluateRecall(event: CognitiveEvent): Promise<RecallDecision>;
}

export interface LearningGuard {
  evaluate(event: CognitiveEvent): Promise<LearningDecision>;
}
