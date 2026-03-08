import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ReasoningContext } from "../brain/reasoning-context";

test("reasoning context records entries and preserves order", () => {
  const context = new ReasoningContext("session-reasoning");
  context.add({
    type: "intent",
    label: "intent_detected",
    value: "summarize",
    source: "unit-test",
  });
  context.add({
    type: "route",
    label: "route_selected",
    value: "mesh_router",
    source: "unit-test",
  });

  const entries = context.snapshot();
  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.label, "intent_detected");
  assert.equal(entries[1]?.label, "route_selected");
});

