"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSessionManager = void 0;
class MessageSessionManager {
    constructor() {
        this.sessions = new Map();
    }
    trackParcel(parcel) {
        const now = new Date().toISOString();
        const existing = this.sessions.get(parcel.sessionId);
        if (existing) {
            existing.parcelIds.push(parcel.parcelId);
            existing.updatedAt = now;
            return;
        }
        this.sessions.set(parcel.sessionId, {
            sessionId: parcel.sessionId,
            parcelIds: [parcel.parcelId],
            createdAt: now,
            updatedAt: now,
        });
    }
    getSessionParcelIds(sessionId) {
        return [...(this.sessions.get(sessionId)?.parcelIds ?? [])];
    }
}
exports.MessageSessionManager = MessageSessionManager;
