import { EXPERIENCE_LIMITS } from "../constants";
import type {
  CircumstantialContext,
  ExperienceOutcomeClassification,
  ExperienceRecord,
} from "../types/experience.types";

function cloneRecord(record: ExperienceRecord): ExperienceRecord {
  return {
    ...record,
    source: { ...record.source },
    situation: { ...record.situation },
    context: { ...record.context, tags: [...record.context.tags] },
    action: { ...record.action },
    verification: { ...record.verification, notes: record.verification.notes ? [...record.verification.notes] : undefined },
    outcome: { ...record.outcome },
    circumstances: { ...record.circumstances },
    learnableValue: { ...record.learnableValue, rationale: [...record.learnableValue.rationale] },
    governanceIssues: [...record.governanceIssues],
    tags: [...record.tags],
  };
}

export type ExperienceCircumstantialSignal = keyof CircumstantialContext;

export class InMemoryExperienceRepository {
  private readonly records: ExperienceRecord[] = [];

  constructor(private readonly maxRecords: number = EXPERIENCE_LIMITS.MAX_IN_MEMORY_RECORDS) {}

  save(record: ExperienceRecord): ExperienceRecord {
    this.records.push(cloneRecord(record));
    if (this.records.length > this.maxRecords) {
      this.records.splice(0, this.records.length - this.maxRecords);
    }
    return cloneRecord(record);
  }

  findById(experienceId: string): ExperienceRecord | undefined {
    const found = this.records.find((record) => record.experienceId === experienceId);
    return found ? cloneRecord(found) : undefined;
  }

  listBySession(sessionId: string): ExperienceRecord[] {
    return this.records.filter((record) => record.sessionId === sessionId).map(cloneRecord);
  }

  listRecent(limit: number = EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT): ExperienceRecord[] {
    const normalizedLimit = Math.max(1, limit);
    const start = Math.max(0, this.records.length - normalizedLimit);
    return this.records.slice(start).reverse().map(cloneRecord);
  }

  listByCapability(capabilityId: string, limit: number = EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT): ExperienceRecord[] {
    return this.records
      .filter((record) => record.action.capabilityId === capabilityId)
      .slice(-Math.max(1, limit))
      .reverse()
      .map(cloneRecord);
  }

  listByOutcome(
    classification: ExperienceOutcomeClassification,
    limit: number = EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT
  ): ExperienceRecord[] {
    return this.records
      .filter((record) => record.outcome.classification === classification)
      .slice(-Math.max(1, limit))
      .reverse()
      .map(cloneRecord);
  }

  findByCircumstantialSignals(
    signals: ExperienceCircumstantialSignal[],
    limit: number = EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT
  ): ExperienceRecord[] {
    const requestedSignals = [...new Set(signals)];
    return this.records
      .filter((record) => requestedSignals.every((signal) => record.circumstances[signal]))
      .slice(-Math.max(1, limit))
      .reverse()
      .map(cloneRecord);
  }

  snapshot(): ExperienceRecord[] {
    return this.records.map(cloneRecord);
  }
}
