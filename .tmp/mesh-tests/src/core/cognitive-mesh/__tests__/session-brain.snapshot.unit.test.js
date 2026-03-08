"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const session_brain_1 = require("../brain/session-brain");
(0, node_test_1.test)("session brain snapshot contains normalized sections and counts", () => {
    const brain = new session_brain_1.SessionBrain("session-snapshot");
    brain.getCognitiveState().transitionIfNotTerminal("understanding", { source: "unit-test" });
    brain.getWorkingMemory().set("runtime.last_route_type", "/api/demo/chat", { source: "unit-test" });
    brain.getReasoningContext().add({
        type: "runtime.input_received",
        label: "chat_input_received",
        value: "hello",
        source: "unit-test",
    });
    brain.getDecisionTrail().record({
        category: "runtime.route_selection",
        decision: "/api/demo/chat",
        source: "unit-test",
    });
    brain.getCognitiveState().markCompleted({ source: "unit-test" });
    const snapshot = brain.snapshot();
    assert.equal(snapshot.sessionId, "session-snapshot");
    assert.equal(snapshot.cognitiveState, "completed");
    assert.equal(snapshot.isTerminal, true);
    assert.equal(snapshot.stateTransitionCount, snapshot.cognitiveTransitions.length);
    assert.equal(snapshot.workingMemoryCount, Object.keys(snapshot.workingMemory).length);
    assert.equal(snapshot.reasoningContextCount, snapshot.reasoningContext.length);
    assert.equal(snapshot.decisionCount, snapshot.decisionTrail.length);
    assert.equal(typeof snapshot.capturedAt, "string");
});
