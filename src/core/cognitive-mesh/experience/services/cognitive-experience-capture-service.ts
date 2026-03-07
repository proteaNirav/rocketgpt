import { ExperienceAssembler, type ExperienceAssemblerOptions } from "./experience-assembler";
import { InMemoryExperienceRepository } from "../repository/in-memory-experience-repository";
import type { ExperienceCaptureFacts, ExperienceRecord } from "../types/experience.types";
import { NEGATIVE_PATH_ISSUES } from "../../governance/negative-path-taxonomy";

export interface CaptureExperienceResult {
  captured: boolean;
  record: ExperienceRecord;
}

export class CognitiveExperienceCaptureService {
  private readonly assembler: ExperienceAssembler;

  constructor(
    private readonly repository: InMemoryExperienceRepository = new InMemoryExperienceRepository(),
    assemblerOptions: ExperienceAssemblerOptions = {}
  ) {
    this.assembler = new ExperienceAssembler(assemblerOptions);
  }

  captureExecutionExperience(facts: ExperienceCaptureFacts): CaptureExperienceResult {
    const record = this.augmentHarmfulPatternTags(this.assembler.assemble(facts));
    if (record.isMeaningful) {
      this.repository.save(record);
      return {
        captured: true,
        record,
      };
    }
    return {
      captured: false,
      record,
    };
  }

  getRepository(): InMemoryExperienceRepository {
    return this.repository;
  }

  private augmentHarmfulPatternTags(record: ExperienceRecord): ExperienceRecord {
    // Repeated-pattern detection is session-local and based on already captured
    // meaningful records in the in-memory repository. A repeated tag is added on
    // the 3rd occurrence (2 prior matching records + current record).
    const priorOccurrencesForRepeatedTag = 2;
    const priorSessionRecords = this.repository.listBySession(record.sessionId);
    const nextTags = [...record.tags];

    const verifierUnavailableCount = priorSessionRecords.filter((entry) =>
      entry.governanceIssues.includes(NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE)
    ).length;
    if (
      record.governanceIssues.includes(NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE) &&
      verifierUnavailableCount >= priorOccurrencesForRepeatedTag
    ) {
      nextTags.push("harmful:repeated_verifier_absence");
    }

    const malformedCount = priorSessionRecords.filter((entry) =>
      entry.governanceIssues.includes(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT)
    ).length;
    if (
      record.governanceIssues.includes(NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT) &&
      malformedCount >= priorOccurrencesForRepeatedTag
    ) {
      nextTags.push("harmful:repeated_malformed_capability_result");
    }

    const fallbackCount = priorSessionRecords.filter((entry) => entry.circumstances.fallbackTriggered).length;
    if (record.circumstances.fallbackTriggered && fallbackCount >= priorOccurrencesForRepeatedTag) {
      nextTags.push("harmful:repeated_fallback_dependency");
    }

    const guardedCount = priorSessionRecords.filter((entry) => entry.outcome.classification === "guarded").length;
    if (record.outcome.classification === "guarded" && guardedCount >= priorOccurrencesForRepeatedTag) {
      nextTags.push("harmful:guarded_outcome_cluster");
    }

    if (record.governanceIssues.includes(NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION)) {
      nextTags.push("harmful:lifecycle_violation_attempt");
    }

    return {
      ...record,
      tags: [...new Set(nextTags)].sort(),
    };
  }
}
