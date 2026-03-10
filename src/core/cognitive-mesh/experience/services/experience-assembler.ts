import { EXPERIENCE_TAGS } from "../constants";
import { deriveCircumstantialContext } from "./circumstantial-context-deriver";
import { assessLearnableValue } from "./learnable-value-assessor";
import { classifyExperienceOutcome } from "./outcome-classifier";
import { ExperienceCapturePolicy } from "./experience-capture-policy";
import type { ExperienceCaptureFacts, ExperienceRecord } from "../types/experience.types";

export interface ExperienceAssemblerOptions {
  createExperienceId?: (sessionId: string) => string;
  capturePolicy?: ExperienceCapturePolicy;
}

let experienceSequence = 0;

function defaultExperienceId(sessionId: string): string {
  experienceSequence += 1;
  return `exp-${sessionId}-${experienceSequence}`;
}

function uniqueSorted(items: string[]): string[] {
  return [...new Set(items)].sort();
}

function deriveTags(facts: ExperienceCaptureFacts, record: Omit<ExperienceRecord, "tags">): string[] {
  const tags = [...(facts.tags ?? []), EXPERIENCE_TAGS.CAPTURED];
  if (record.outcome.classification === "guarded") {
    tags.push(EXPERIENCE_TAGS.GUARDED);
  }
  if (record.outcome.classification === "failed") {
    tags.push(EXPERIENCE_TAGS.FAILED);
  }
  if (record.outcome.classification === "successful-with-fallback") {
    tags.push(EXPERIENCE_TAGS.FALLBACK);
  }
  if (record.verification.required) {
    tags.push(EXPERIENCE_TAGS.VERIFIED);
  }
  if (record.action.capabilityId) {
    tags.push(`capability:${record.action.capabilityId}`);
  }
  for (const issue of record.governanceIssues) {
    tags.push(`issue:${issue}`);
  }
  tags.push(`outcome:${record.outcome.classification}`);
  return uniqueSorted(tags);
}

export class ExperienceAssembler {
  private readonly createExperienceId: (sessionId: string) => string;
  private readonly capturePolicy: ExperienceCapturePolicy;

  constructor(options: ExperienceAssemblerOptions = {}) {
    this.createExperienceId = options.createExperienceId ?? defaultExperienceId;
    this.capturePolicy = options.capturePolicy ?? new ExperienceCapturePolicy();
  }

  assemble(facts: ExperienceCaptureFacts): ExperienceRecord {
    const circumstances = deriveCircumstantialContext(facts.circumstances);
    const normalizedFacts: ExperienceCaptureFacts = {
      ...facts,
      circumstances: { ...facts.circumstances },
    };
    const outcome = classifyExperienceOutcome(normalizedFacts);
    const learnableValue = assessLearnableValue(outcome, circumstances);

    const draft: Omit<ExperienceRecord, "tags"> = {
      experienceId: this.createExperienceId(facts.sessionId),
      experienceType: "execution",
      experienceCategory: "execution_success",
      experienceOutcome: "positive",
      experienceScore: 0,
      experienceConfidence: 0,
      sessionId: facts.sessionId,
      timestamp: facts.timestamp,
      sourceCapability: facts.action.capabilityId,
      relatedMemoryId: facts.relatedMemoryId,
      relatedExecutionId: facts.relatedExecutionId ?? facts.source.eventId,
      relatedSignals: [...(facts.relatedSignals ?? [])],
      relatedReinforcementEvents: [...(facts.relatedReinforcementEvents ?? [])],
      experienceTags: [...(facts.tags ?? [])],
      experienceMetadata: { ...(facts.experienceMetadata ?? {}) },
      source: { ...facts.source },
      situation: { ...facts.situation },
      context: {
        ...facts.context,
        riskScore: Number.isFinite(facts.context.riskScore) ? facts.context.riskScore : 0,
        tags: [...facts.context.tags],
      },
      action: { ...facts.action },
      verification: { ...facts.verification, notes: facts.verification.notes ? [...facts.verification.notes] : undefined },
      outcome,
      circumstances,
      learnableValue,
      governanceIssues: [...(facts.governanceIssues ?? [])],
      relevanceScore: 0,
      isMeaningful: false,
    };

    const tags = deriveTags(facts, draft);
    const policyDecision = this.capturePolicy.shouldCaptureExperience({ ...draft, tags });

    return {
      ...draft,
      tags,
      relevanceScore: policyDecision.relevanceScore,
      isMeaningful: policyDecision.shouldCapture,
    };
  }
}
