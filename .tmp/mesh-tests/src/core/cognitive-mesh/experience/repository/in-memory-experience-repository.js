"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryExperienceRepository = void 0;
const constants_1 = require("../constants");
function cloneRecord(record) {
    return {
        ...record,
        relatedSignals: [...record.relatedSignals],
        relatedReinforcementEvents: record.relatedReinforcementEvents.map((event) => ({
            ...event,
            reasonCodes: [...event.reasonCodes],
        })),
        experienceTags: [...record.experienceTags],
        experienceMetadata: { ...record.experienceMetadata },
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
class InMemoryExperienceRepository {
    constructor(maxRecords = constants_1.EXPERIENCE_LIMITS.MAX_IN_MEMORY_RECORDS) {
        this.maxRecords = maxRecords;
        this.records = [];
    }
    save(record) {
        this.records.push(cloneRecord(record));
        if (this.records.length > this.maxRecords) {
            this.records.splice(0, this.records.length - this.maxRecords);
        }
        return cloneRecord(record);
    }
    findById(experienceId) {
        const found = this.records.find((record) => record.experienceId === experienceId);
        return found ? cloneRecord(found) : undefined;
    }
    listBySession(sessionId) {
        return this.records.filter((record) => record.sessionId === sessionId).map(cloneRecord);
    }
    listRecent(limit = constants_1.EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT) {
        const normalizedLimit = Math.max(1, limit);
        const start = Math.max(0, this.records.length - normalizedLimit);
        return this.records.slice(start).reverse().map(cloneRecord);
    }
    listByCapability(capabilityId, limit = constants_1.EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT) {
        return this.records
            .filter((record) => record.action.capabilityId === capabilityId)
            .slice(-Math.max(1, limit))
            .reverse()
            .map(cloneRecord);
    }
    listByOutcome(classification, limit = constants_1.EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT) {
        return this.records
            .filter((record) => record.outcome.classification === classification)
            .slice(-Math.max(1, limit))
            .reverse()
            .map(cloneRecord);
    }
    findByCircumstantialSignals(signals, limit = constants_1.EXPERIENCE_LIMITS.DEFAULT_RECENT_LIMIT) {
        const requestedSignals = [...new Set(signals)];
        return this.records
            .filter((record) => requestedSignals.every((signal) => record.circumstances[signal]))
            .slice(-Math.max(1, limit))
            .reverse()
            .map(cloneRecord);
    }
    snapshot() {
        return this.records.map(cloneRecord);
    }
}
exports.InMemoryExperienceRepository = InMemoryExperienceRepository;
