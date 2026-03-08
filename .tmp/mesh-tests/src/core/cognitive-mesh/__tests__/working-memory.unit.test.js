"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const working_memory_1 = require("../brain/working-memory");
(0, node_test_1.test)("working memory set/get/overwrite/delete/snapshot", () => {
    const memory = new working_memory_1.WorkingMemory("session-wm");
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
