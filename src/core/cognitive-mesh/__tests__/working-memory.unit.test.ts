import { test } from "node:test";
import * as assert from "node:assert/strict";
import { WorkingMemory } from "../brain/working-memory";

test("working memory set/get/overwrite/delete/snapshot", () => {
  const memory = new WorkingMemory("session-wm");

  memory.set("intent", "summarize", { source: "unit-test" });
  assert.equal(memory.get("intent"), "summarize");
  assert.equal(memory.has("intent"), true);

  memory.set("intent", "analyze", { source: "unit-test-overwrite" });
  assert.equal(memory.get("intent"), "analyze");

  const snapshot = memory.snapshot();
  assert.equal(snapshot.intent?.value, "analyze");
  assert.equal(snapshot.intent?.source, "unit-test-overwrite");

  const deleted = memory.delete("intent");
  assert.equal(deleted, true);
  assert.equal(memory.has("intent"), false);
});

