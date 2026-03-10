import {
  InMemoryExperienceRepository,
  type ExperienceCircumstantialSignal,
} from "../repository/in-memory-experience-repository";
import type { ExperienceOutcomeClassification, ExperienceRecord } from "../types/experience.types";

export class ExperienceRetrievalService {
  constructor(private readonly repository: InMemoryExperienceRepository) {}

  getRecentExperiences(sessionId: string, limit: number = 20): ExperienceRecord[] {
    const sessionRecords = this.repository.listBySession(sessionId);
    return sessionRecords.slice(-Math.max(1, limit)).reverse();
  }

  getExperiencesByCapability(capabilityId: string, limit: number = 20): ExperienceRecord[] {
    return this.repository.listByCapability(capabilityId, limit);
  }

  getExperiencesByOutcome(classification: ExperienceOutcomeClassification, limit: number = 20): ExperienceRecord[] {
    return this.repository.listByOutcome(classification, limit);
  }

  findByCircumstantialSignals(signals: ExperienceCircumstantialSignal[], limit: number = 20): ExperienceRecord[] {
    return this.repository.findByCircumstantialSignals(signals, limit);
  }
}
