import { ConversationMemoryCapture } from "./conversation-memory-capture";
import { AdoptedRecallFoundation, type AdoptedRecallResult } from "./adopted-recall-foundation";
import { ExperienceSynthesisService } from "./experience-synthesis-service";
import { ExplicitRecallEngine } from "./explicit-recall-engine";
import { ImplicitResurfacingEngine } from "./implicit-resurfacing-engine";
import { MemoryPacketService } from "./memory-packet-service";
import {
  MemoryReinforcementScoring,
  type MemoryReinforcementInput,
  type MemoryReinforcementOutcome,
} from "./memory-reinforcement-scoring";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";
import type {
  CatFeedback,
  ConversationMessage,
  ConversationSession,
  MemoryItem,
  MemoryExperienceRecord,
  MemoryAccessContext,
  MemoryRecallQuery,
  MemoryResurfaceInput,
  MemoryPacket,
  UnresolvedItem,
} from "./types/dual-mode-memory.types";

export interface CognitiveMemoryServiceOptions {
  experienceProvider?: (sessionId: string, capabilityId?: string, limit?: number) => MemoryExperienceRecord[];
}

export class CognitiveMemoryService {
  private readonly capture: ConversationMemoryCapture;
  private readonly explicitRecall: ExplicitRecallEngine;
  private readonly implicitResurfacing: ImplicitResurfacingEngine;
  private readonly packetService: MemoryPacketService;
  private readonly synthesis: ExperienceSynthesisService;
  private readonly adoptedRecallFoundation: AdoptedRecallFoundation;
  private readonly reinforcementScoring: MemoryReinforcementScoring;

  private readonly experienceProvider?: CognitiveMemoryServiceOptions["experienceProvider"];

  constructor(
    private readonly repository: InMemoryCognitiveMemoryRepository = new InMemoryCognitiveMemoryRepository(),
    options: CognitiveMemoryServiceOptions = {}
  ) {
    this.capture = new ConversationMemoryCapture(this.repository);
    this.explicitRecall = new ExplicitRecallEngine(this.repository);
    this.implicitResurfacing = new ImplicitResurfacingEngine(this.repository);
    this.packetService = new MemoryPacketService(this.repository);
    this.synthesis = new ExperienceSynthesisService();
    this.adoptedRecallFoundation = new AdoptedRecallFoundation();
    this.reinforcementScoring = new MemoryReinforcementScoring();
    this.experienceProvider = options.experienceProvider;
  }

  startSession(session: ConversationSession): void {
    this.capture.upsertSession(session);
  }

  captureConversationMessage(
    message: Omit<ConversationMessage, "messageId" | "createdAt"> & { createdAt?: string }
  ): void {
    this.capture.captureMessage(message);
  }

  explicitRecallSearch(query: MemoryRecallQuery) {
    return this.explicitRecall.recall(query);
  }

  implicitResurface(input: MemoryResurfaceInput) {
    return this.implicitResurfacing.resurface(input);
  }

  buildMemoryPacket(context: MemoryAccessContext, options?: { limit?: number; relevanceFloor?: number; query?: string }): MemoryPacket {
    return this.packetService.buildPacket(context, options);
  }

  recallAdoptedMemory(input: {
    sessionId: string;
    query?: string;
    intentHint?: string;
    routeType?: string;
    capabilityId?: string;
    riskScore?: number;
    maxItems?: number;
  }): AdoptedRecallResult {
    const items = this.repository.listMemoryBySession(input.sessionId);
    return this.adoptedRecallFoundation.recall({
      sessionId: input.sessionId,
      items,
      query: input.query,
      intentHint: input.intentHint,
      routeType: input.routeType,
      capabilityId: input.capabilityId,
      riskScore: input.riskScore,
      maxItems: input.maxItems,
    });
  }

  synthesizeExperienceFeedback(
    feedback: CatFeedback,
    currentExperience: MemoryExperienceRecord | undefined,
    options: { priorByCapabilityLimit?: number } = {}
  ): void {
    const prior = this.experienceProvider
      ? this.experienceProvider(
          feedback.sessionId,
          currentExperience?.action.capabilityId,
          options.priorByCapabilityLimit ?? 20
        )
      : currentExperience
        ? [currentExperience]
        : [];
    const synthesized = this.synthesis.synthesize(feedback, currentExperience, prior);
    this.repository.saveMemory(synthesized.memory);
  }

  upsertUnresolved(item: UnresolvedItem): void {
    this.repository.upsertUnresolved(item);
  }

  saveMemoryItem(memory: MemoryItem): void {
    this.repository.saveMemory(memory);
  }

  reinforceMemory(input: MemoryReinforcementInput): MemoryReinforcementOutcome | undefined {
    const existing = this.repository.findMemoryById(input.memoryId);
    if (!existing) {
      return undefined;
    }
    const currentScore =
      typeof existing.metadata?.reinforcementScore === "number"
        ? (existing.metadata.reinforcementScore as number)
        : undefined;
    const currentEvents =
      typeof existing.metadata?.reinforcementEvents === "number"
        ? (existing.metadata.reinforcementEvents as number)
        : undefined;
    const outcome = this.reinforcementScoring.evaluate({
      ...input,
      currentScore,
      currentEvents,
    });
    const reinforcementState = outcome.state;
    const next: MemoryItem = {
      ...existing,
      scores: {
        ...existing.scores,
        reuse: clamp01(existing.scores.reuse + outcome.delta * 0.2),
        relevance: clamp01(existing.scores.relevance + outcome.delta * 0.15),
        confidence: clamp01(existing.scores.confidence + outcome.delta * 0.1),
      },
      updatedAt: reinforcementState.lastReinforcedTimestamp,
      metadata: {
        ...(existing.metadata ? { ...existing.metadata } : {}),
        reinforcementScore: reinforcementState.reinforcementScore,
        reinforcementEvents: reinforcementState.reinforcementEvents,
        reinforcementReasonCodes: [...reinforcementState.reinforcementReasonCodes],
        lastReinforcedTimestamp: reinforcementState.lastReinforcedTimestamp,
        reinforcementConfidence: reinforcementState.reinforcementConfidence,
        reinforcementTrend: reinforcementState.reinforcementTrend,
      },
    };
    this.repository.saveMemory(next);
    return outcome;
  }

  listMemoryBySession(sessionId: string) {
    return this.repository.listMemoryBySession(sessionId);
  }

  listRecallEventsBySession(sessionId: string) {
    return this.repository.listRecallEventsBySession(sessionId);
  }

  getRepository(): InMemoryCognitiveMemoryRepository {
    return this.repository;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
