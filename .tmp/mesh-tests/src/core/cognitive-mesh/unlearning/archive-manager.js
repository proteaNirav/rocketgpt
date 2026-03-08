"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultArchiveManager = void 0;
/**
 * DefaultArchiveManager is intentionally side-effect free in V1.
 */
class DefaultArchiveManager {
    async archiveEvent(_event, _reason) {
        // intentionally no-op
    }
    async unlearnBySession(_sessionId, _reason) {
        // intentionally no-op
    }
}
exports.DefaultArchiveManager = DefaultArchiveManager;
