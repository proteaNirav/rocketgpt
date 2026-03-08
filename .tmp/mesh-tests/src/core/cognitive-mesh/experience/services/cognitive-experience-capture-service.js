"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveExperienceCaptureService = void 0;
const experience_assembler_1 = require("./experience-assembler");
const experience_engine_1 = require("./experience-engine");
const in_memory_experience_repository_1 = require("../repository/in-memory-experience-repository");
const negative_path_taxonomy_1 = require("../../governance/negative-path-taxonomy");
class CognitiveExperienceCaptureService {
    constructor(repository = new in_memory_experience_repository_1.InMemoryExperienceRepository(), assemblerOptions = {}) {
        this.repository = repository;
        this.assembler = new experience_assembler_1.ExperienceAssembler(assemblerOptions);
        this.experienceEngine = new experience_engine_1.ExperienceEngine();
    }
    captureExecutionExperience(facts) {
        const assembled = this.assembler.assemble(facts);
        const finalized = this.experienceEngine.finalize(assembled, facts);
        const record = this.augmentHarmfulPatternTags(finalized);
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
    getRepository() {
        return this.repository;
    }
    augmentHarmfulPatternTags(record) {
        // Repeated-pattern detection is session-local and based on already captured
        // meaningful records in the in-memory repository. A repeated tag is added on
        // the 3rd occurrence (2 prior matching records + current record).
        const priorOccurrencesForRepeatedTag = 2;
        const priorSessionRecords = this.repository.listBySession(record.sessionId);
        const nextTags = [...record.tags];
        const verifierUnavailableCount = priorSessionRecords.filter((entry) => entry.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE)).length;
        if (record.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.VERIFICATION_UNAVAILABLE) &&
            verifierUnavailableCount >= priorOccurrencesForRepeatedTag) {
            nextTags.push("harmful:repeated_verifier_absence");
        }
        const malformedCount = priorSessionRecords.filter((entry) => entry.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT)).length;
        if (record.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.CAPABILITY_MALFORMED_RESULT) &&
            malformedCount >= priorOccurrencesForRepeatedTag) {
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
        if (record.governanceIssues.includes(negative_path_taxonomy_1.NEGATIVE_PATH_ISSUES.LIFECYCLE_VIOLATION)) {
            nextTags.push("harmful:lifecycle_violation_attempt");
        }
        return {
            ...record,
            tags: [...new Set(nextTags)].sort(),
        };
    }
}
exports.CognitiveExperienceCaptureService = CognitiveExperienceCaptureService;
