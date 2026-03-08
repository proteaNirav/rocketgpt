"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const decision_trail_1 = require("../brain/decision-trail");
(0, node_test_1.test)("decision trail records decisions in order", () => {
    const trail = new decision_trail_1.DecisionTrail("session-decisions");
    trail.record({
        category: "route",
        decision: "public_bus",
        confidence: 0.82,
        source: "unit-test",
    });
    trail.record({
        category: "cat_selection",
        decision: "knowledge-cat",
        confidence: 0.75,
        source: "unit-test",
    });
    const decisions = trail.snapshot();
    assert.equal(decisions.length, 2);
    assert.equal(decisions[0]?.decision, "public_bus");
    assert.equal(decisions[1]?.decision, "knowledge-cat");
});
