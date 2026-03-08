"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionBrain = void 0;
const cognitive_state_1 = require("./cognitive-state");
const decision_trail_1 = require("./decision-trail");
const reasoning_context_1 = require("./reasoning-context");
const working_memory_1 = require("./working-memory");
class SessionBrain {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.workingMemory = new working_memory_1.WorkingMemory(sessionId);
        this.reasoningContext = new reasoning_context_1.ReasoningContext(sessionId);
        this.decisionTrail = new decision_trail_1.DecisionTrail(sessionId);
        this.cognitiveState = new cognitive_state_1.CognitiveState(sessionId);
    }
    getSessionId() {
        return this.sessionId;
    }
    getWorkingMemory() {
        return this.workingMemory;
    }
    getReasoningContext() {
        return this.reasoningContext;
    }
    getDecisionTrail() {
        return this.decisionTrail;
    }
    getCognitiveState() {
        return this.cognitiveState;
    }
    snapshot() {
        const transitions = this.cognitiveState.getTransitions();
        const workingMemory = this.workingMemory.snapshot();
        const reasoningContext = this.reasoningContext.snapshot();
        const decisionTrail = this.decisionTrail.snapshot();
        return {
            sessionId: this.sessionId,
            cognitiveState: this.cognitiveState.getState(),
            cognitiveTransitions: transitions,
            stateTransitionCount: transitions.length,
            workingMemory,
            workingMemoryCount: Object.keys(workingMemory).length,
            reasoningContext,
            reasoningContextCount: reasoningContext.length,
            decisionTrail,
            decisionCount: decisionTrail.length,
            isTerminal: this.cognitiveState.hasReachedTerminalState(),
            capturedAt: new Date().toISOString(),
        };
    }
}
exports.SessionBrain = SessionBrain;
