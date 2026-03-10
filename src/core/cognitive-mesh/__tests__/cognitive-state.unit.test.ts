import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CognitiveState } from "../brain/cognitive-state";

test("cognitive state initializes and transitions correctly", () => {
  const state = new CognitiveState("session-state");
  assert.equal(state.getState(), "initializing");

  state.transitionTo("understanding", { source: "unit-test", reason: "parse_request" });
  state.transitionTo("planning", { source: "unit-test", reason: "intent_ready" });
  state.transitionTo("executing", { source: "unit-test", reason: "dispatch_route" });

  assert.equal(state.getState(), "executing");
  const transitions = state.getTransitions();
  assert.equal(transitions.length, 3);
  assert.equal(transitions[0]?.from, "initializing");
  assert.equal(transitions[0]?.to, "understanding");
  assert.equal(typeof transitions[0]?.timestamp, "string");
  assert.equal(transitions[0]?.source, "unit-test");
  assert.equal(transitions[0]?.reason, "parse_request");
});

test("cognitive state terminal helpers prevent stranded non-terminal transitions", () => {
  const state = new CognitiveState("terminal-session");
  state.transitionIfNotTerminal("understanding", { source: "unit-test" });
  state.markCompleted({ source: "unit-test", reason: "success" });

  assert.equal(state.hasReachedTerminalState(), true);
  assert.equal(state.getState(), "completed");

  const blocked = state.transitionIfNotTerminal("executing", { source: "unit-test" });
  assert.equal(blocked, null);
  assert.equal(state.getState(), "completed");
});
