"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceRetrievalService = void 0;
class ExperienceRetrievalService {
    constructor(repository) {
        this.repository = repository;
    }
    getRecentExperiences(sessionId, limit = 20) {
        const sessionRecords = this.repository.listBySession(sessionId);
        return sessionRecords.slice(-Math.max(1, limit)).reverse();
    }
    getExperiencesByCapability(capabilityId, limit = 20) {
        return this.repository.listByCapability(capabilityId, limit);
    }
    getExperiencesByOutcome(classification, limit = 20) {
        return this.repository.listByOutcome(classification, limit);
    }
    findByCircumstantialSignals(signals, limit = 20) {
        return this.repository.findByCircumstantialSignals(signals, limit);
    }
}
exports.ExperienceRetrievalService = ExperienceRetrievalService;
