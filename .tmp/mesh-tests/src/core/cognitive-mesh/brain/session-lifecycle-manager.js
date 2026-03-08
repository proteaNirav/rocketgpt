"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionLifecycleManager = void 0;
const session_brain_1 = require("./session-brain");
class SessionLifecycleManager {
    constructor() {
        this.sessions = new Map();
    }
    createSession(sessionId) {
        const existing = this.sessions.get(sessionId);
        if (existing && !existing.getCognitiveState().hasReachedTerminalState()) {
            return existing;
        }
        const brain = new session_brain_1.SessionBrain(sessionId);
        this.sessions.set(sessionId, brain);
        return brain;
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    getOrCreateSession(sessionId) {
        const existing = this.getSession(sessionId);
        if (!existing) {
            return this.createSession(sessionId);
        }
        if (existing.getCognitiveState().hasReachedTerminalState()) {
            return this.createSession(sessionId);
        }
        return existing;
    }
    hasSession(sessionId) {
        return this.sessions.has(sessionId);
    }
    hasActiveSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        return !session.getCognitiveState().hasReachedTerminalState();
    }
    destroySession(sessionId) {
        return this.sessions.delete(sessionId);
    }
    destroySessionIfTerminal(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return false;
        }
        if (!session.getCognitiveState().hasReachedTerminalState()) {
            return false;
        }
        return this.sessions.delete(sessionId);
    }
    finalizeSession(sessionId, outcome, options = {}) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return undefined;
        }
        if (outcome === "completed") {
            session.getCognitiveState().markCompleted({
                reason: options.reason,
                source: options.source,
            });
        }
        else {
            session.getCognitiveState().markFailed({
                reason: options.reason,
                source: options.source,
            });
        }
        const snapshot = session.snapshot();
        if (options.destroyOnFinalize) {
            this.sessions.delete(sessionId);
        }
        return snapshot;
    }
    sessionCount() {
        return this.sessions.size;
    }
    snapshot(sessionId) {
        return this.sessions.get(sessionId)?.snapshot();
    }
    snapshotAll() {
        return [...this.sessions.values()].map((brain) => brain.snapshot());
    }
}
exports.SessionLifecycleManager = SessionLifecycleManager;
