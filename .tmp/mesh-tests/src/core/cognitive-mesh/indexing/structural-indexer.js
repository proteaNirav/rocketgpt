"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuralIndexer = void 0;
/**
 * StructuralIndexer builds low-cost lexical/shape metadata only.
 * Vector embeddings and semantic indexing are intentionally deferred.
 */
class StructuralIndexer {
    build(event) {
        const tags = [
            `source_type:${event.sourceType}`,
            `session_id:${event.sessionId}`,
            `request_id:${event.requestId ?? "none"}`,
            `route_type:${event.routeType ?? "unspecified"}`,
            `trust_class:${event.trustClass}`,
        ];
        const project = this.pickMetadata(event, ["project", "projectId", "domain", "catsDomain"]);
        if (project) {
            tags.push(`project_or_domain:${project}`);
        }
        const payload = {
            source: event.source,
            sourceType: event.sourceType,
            routeType: event.routeType ?? null,
            trustClass: event.trustClass,
            sessionId: event.sessionId,
            requestId: event.requestId ?? null,
            projectOrDomain: project,
            tokenEstimate: this.estimateTokens(event.normalizedInput),
            inputLength: event.normalizedInput.length,
            tags: [...tags, ...(event.tags ?? [])],
        };
        return {
            id: `idx_${event.eventId}`,
            eventId: event.eventId,
            sessionId: event.sessionId,
            indexType: "structural",
            payload,
            createdAt: new Date().toISOString(),
        };
    }
    estimateTokens(text) {
        if (!text) {
            return 0;
        }
        return Math.ceil(text.length / 4);
    }
    pickMetadata(event, keys) {
        for (const key of keys) {
            const value = event.metadata?.[key];
            if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
            }
        }
        return null;
    }
}
exports.StructuralIndexer = StructuralIndexer;
