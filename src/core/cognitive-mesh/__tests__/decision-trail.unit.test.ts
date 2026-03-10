import { test } from "node:test";
import * as assert from "node:assert/strict";
import { DecisionTrail } from "../brain/decision-trail";

test("decision trail records decisions in order", () => {
  const trail = new DecisionTrail("session-decisions");
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

