"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveState = void 0;
class CognitiveState {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.state = "initializing";
        this.transitions = [];
    }
    getState() {
        return this.state;
    }
    transitionTo(nextState, options = {}) {
        const transition = {
            from: this.state,
            to: nextState,
            timestamp: new Date().toISOString(),
            reason: options.reason,
            source: options.source,
        };
        this.state = nextState;
        this.transitions.push(transition);
        return transition;
    }
    transitionIfNotTerminal(nextState, options = {}) {
        if (this.hasReachedTerminalState()) {
            return null;
        }
        return this.transitionTo(nextState, options);
    }
    markCompleted(options = {}) {
        return this.transitionIfNotTerminal("completed", options);
    }
    markFailed(options = {}) {
        return this.transitionIfNotTerminal("failed", options);
    }
    hasReachedTerminalState() {
        return CognitiveState.isTerminalState(this.state);
    }
    static isTerminalState(state) {
        return state === "completed" || state === "failed";
    }
    getTransitions() {
        return this.transitions.map((transition) => ({ ...transition }));
    }
    getSessionId() {
        return this.sessionId;
    }
}
exports.CognitiveState = CognitiveState;
