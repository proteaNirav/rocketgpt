"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceAssembler = void 0;
const constants_1 = require("../constants");
const circumstantial_context_deriver_1 = require("./circumstantial-context-deriver");
const learnable_value_assessor_1 = require("./learnable-value-assessor");
const outcome_classifier_1 = require("./outcome-classifier");
const experience_capture_policy_1 = require("./experience-capture-policy");
let experienceSequence = 0;
function defaultExperienceId(sessionId) {
    experienceSequence += 1;
    return `exp-${sessionId}-${experienceSequence}`;
}
function uniqueSorted(items) {
    return [...new Set(items)].sort();
}
function deriveTags(facts, record) {
    const tags = [...(facts.tags ?? []), constants_1.EXPERIENCE_TAGS.CAPTURED];
    if (record.outcome.classification === "guarded") {
        tags.push(constants_1.EXPERIENCE_TAGS.GUARDED);
    }
    if (record.outcome.classification === "failed") {
        tags.push(constants_1.EXPERIENCE_TAGS.FAILED);
    }
    if (record.outcome.classification === "successful-with-fallback") {
        tags.push(constants_1.EXPERIENCE_TAGS.FALLBACK);
    }
    if (record.verification.required) {
        tags.push(constants_1.EXPERIENCE_TAGS.VERIFIED);
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
class ExperienceAssembler {
    constructor(options = {}) {
        this.createExperienceId = options.createExperienceId ?? defaultExperienceId;
        this.capturePolicy = options.capturePolicy ?? new experience_capture_policy_1.ExperienceCapturePolicy();
    }
    assemble(facts) {
        const circumstances = (0, circumstantial_context_deriver_1.deriveCircumstantialContext)(facts.circumstances);
        const normalizedFacts = {
            ...facts,
            circumstances: { ...facts.circumstances },
        };
        const outcome = (0, outcome_classifier_1.classifyExperienceOutcome)(normalizedFacts);
        const learnableValue = (0, learnable_value_assessor_1.assessLearnableValue)(outcome, circumstances);
        const draft = {
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
exports.ExperienceAssembler = ExperienceAssembler;
