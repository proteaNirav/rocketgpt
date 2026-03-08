"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Categorizer = void 0;
/**
 * Categorizer performs cheap structural bucketing only.
 * Model-assisted categorization is deferred.
 */
class Categorizer {
    categorize(event) {
        const tags = new Set();
        tags.add(`source:${event.source}`);
        tags.add(`trust:${event.trustClass}`);
        if (event.normalizedInput.length > 1000) {
            tags.add("long_form");
        }
        return [...tags];
    }
}
exports.Categorizer = Categorizer;
