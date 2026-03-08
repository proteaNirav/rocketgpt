"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultQuarantineManager = void 0;
/**
 * DefaultQuarantineManager is a no-op placeholder.
 * It returns deterministic ids and does not persist globally in V1.
 */
class DefaultQuarantineManager {
    async quarantine(event, _reasons) {
        return `q_${event.eventId}`;
    }
}
exports.DefaultQuarantineManager = DefaultQuarantineManager;
