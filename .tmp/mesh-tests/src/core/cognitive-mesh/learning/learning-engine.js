"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningEngine = void 0;
/**
 * LearningEngine coordinates guarded learning decisions.
 * It does not implement autonomous learning in this foundation.
 */
class LearningEngine {
    constructor(learningGuard, archiveManager) {
        this.learningGuard = learningGuard;
        this.archiveManager = archiveManager;
    }
    async evaluate(event) {
        const decision = await this.learningGuard.evaluate(event);
        if (decision.disposition === "archive" || decision.disposition === "reject") {
            await this.archiveManager.archiveEvent(event, decision.disposition);
            return { decision, promoted: false };
        }
        return { decision, promoted: decision.disposition === "promote" };
    }
}
exports.LearningEngine = LearningEngine;
