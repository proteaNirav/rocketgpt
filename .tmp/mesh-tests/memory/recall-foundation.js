"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecallFoundation = void 0;
class RecallFoundation {
    constructor(repository) {
        this.repository = repository;
    }
    async recall(event, decision, workingMemory, options) {
        const maxItems = options?.maxItems ?? 10;
        const maxChars = options?.maxChars ?? 2500;
        if (decision.disposition === "exclude") {
            return {
                items: [],
                filteredCount: workingMemory.length,
                sources: [],
                dispositionSummary: `${decision.disposition}:${decision.reasons.join(",")}`,
            };
        }
        const [recentEvents, recentMemory] = await Promise.all([
            this.repository.findRecentEvents({
                sessionId: event.sessionId,
                sourceType: event.sourceType,
                routeType: event.routeType,
                limit: 6,
            }),
            this.repository.findRecentMemoryItems({
                sessionId: event.sessionId,
                limit: 6,
                maxChars,
            }),
        ]);
        const trustAllowed = decision.disposition === "allow" || decision.disposition === "allow_low_confidence";
        const eventItems = trustAllowed
            ? recentEvents.map((item) => ({
                id: item.eventId,
                content: item.normalizedInput,
                source: "recent_event",
            }))
            : [];
        const memoryItems = this.toRecallItems(workingMemory, "working_memory");
        const repoMemoryItems = trustAllowed ? this.toRecallItems(recentMemory, "repository_memory") : [];
        const combined = [...memoryItems, ...repoMemoryItems, ...eventItems];
        const filtered = combined.filter((item) => item.content.length > 0);
        const bounded = [];
        let charCount = 0;
        for (const item of filtered) {
            if (bounded.length >= maxItems) {
                break;
            }
            charCount += item.content.length;
            if (charCount > maxChars) {
                break;
            }
            bounded.push(item);
        }
        const sources = Array.from(new Set(bounded.map((item) => item.source)));
        return {
            items: bounded,
            filteredCount: combined.length - bounded.length,
            sources,
            dispositionSummary: `${decision.disposition}:${decision.reasons.join(",")}`,
        };
    }
    toRecallItems(records, source) {
        return records.map((item) => ({
            id: item.id,
            content: item.content,
            source,
        }));
    }
}
exports.RecallFoundation = RecallFoundation;
