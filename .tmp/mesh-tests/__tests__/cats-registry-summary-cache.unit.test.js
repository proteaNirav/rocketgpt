"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = require("node:assert/strict");
const cats_registry_summary_cache_1 = require("../cats/cats-registry-summary-cache");
(0, node_test_1.test)("cats registry summary cache stores and returns summaries", () => {
    const cache = new cats_registry_summary_cache_1.CatsRegistrySummaryCache({ ttlMs: 60000, maxEntries: 2 });
    const first = cache.set("cats:demo", "demo summary");
    const read = cache.get("cats:demo");
    assert.equal(read?.summary, "demo summary");
    assert.equal(read?.key, first.key);
});
(0, node_test_1.test)("cats registry summary cache evicts oldest entries when bounded", () => {
    const cache = new cats_registry_summary_cache_1.CatsRegistrySummaryCache({ ttlMs: 60000, maxEntries: 2 });
    cache.set("k1", "v1");
    cache.set("k2", "v2");
    cache.set("k3", "v3");
    assert.equal(cache.get("k1"), null);
    assert.equal(cache.get("k2")?.summary, "v2");
    assert.equal(cache.get("k3")?.summary, "v3");
});
