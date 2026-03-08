"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const session_lifecycle_manager_1 = require("../brain/session-lifecycle-manager");
(0, node_test_1.test)("session lifecycle manager creates, gets, destroys, and creates-if-missing", () => {
    const manager = new session_lifecycle_manager_1.SessionLifecycleManager();
    const created = manager.createSession("session-1");
    assert.equal(manager.hasSession("session-1"), true);
    assert.equal(manager.getSession("session-1"), created);
    const same = manager.getOrCreateSession("session-1");
    assert.equal(same, created);
    const fresh = manager.getOrCreateSession("session-2");
    assert.equal(fresh.getSessionId(), "session-2");
    assert.equal(manager.sessionCount(), 2);
    const destroyed = manager.destroySession("session-1");
    assert.equal(destroyed, true);
    assert.equal(manager.hasSession("session-1"), false);
    const recreated = manager.getOrCreateSession("session-1");
    assert.equal(recreated.getSessionId(), "session-1");
});
(0, node_test_1.test)("session lifecycle manager supports active/terminal cleanup helpers", () => {
    const manager = new session_lifecycle_manager_1.SessionLifecycleManager();
    const session = manager.getOrCreateSession("session-term");
    assert.equal(manager.hasActiveSession("session-term"), true);
    assert.equal(manager.destroySessionIfTerminal("session-term"), false);
    session.getCognitiveState().markFailed({ source: "unit-test", reason: "forced_failure" });
    assert.equal(manager.hasActiveSession("session-term"), false);
    assert.equal(manager.destroySessionIfTerminal("session-term"), true);
    assert.equal(manager.getSession("session-term"), undefined);
});
(0, node_test_1.test)("session lifecycle manager recreates session after terminal state on getOrCreate", () => {
    const manager = new session_lifecycle_manager_1.SessionLifecycleManager();
    const initial = manager.getOrCreateSession("session-reentry");
    initial.getWorkingMemory().set("runtime.last_route_type", "/api/demo/chat", { source: "unit-test" });
    initial.getCognitiveState().markCompleted({ source: "unit-test", reason: "done" });
    const recreated = manager.getOrCreateSession("session-reentry");
    assert.notEqual(recreated, initial);
    assert.equal(recreated.getCognitiveState().getState(), "initializing");
    assert.equal(recreated.getWorkingMemory().has("runtime.last_route_type"), false);
});
(0, node_test_1.test)("session lifecycle manager duplicate finalization does not mutate terminal transition history", () => {
    const manager = new session_lifecycle_manager_1.SessionLifecycleManager();
    manager.getOrCreateSession("session-finalize");
    const first = manager.finalizeSession("session-finalize", "completed", {
        source: "unit-test",
        reason: "first_finalize",
    });
    const second = manager.finalizeSession("session-finalize", "failed", {
        source: "unit-test",
        reason: "second_finalize_attempt",
    });
    assert.ok(first);
    assert.ok(second);
    assert.equal(second?.cognitiveState, "completed");
    assert.equal(second?.isTerminal, true);
    assert.equal(second?.stateTransitionCount, first?.stateTransitionCount);
});
