import { test } from "node:test";
import * as assert from "node:assert/strict";
import { CatsRegistrySummaryCache } from "../cats/cats-registry-summary-cache";

test("cats registry summary cache stores and returns summaries", () => {
  const cache = new CatsRegistrySummaryCache({ ttlMs: 60_000, maxEntries: 2 });
  const first = cache.set("cats:demo", "demo summary");
  const read = cache.get("cats:demo");
  assert.equal(read?.summary, "demo summary");
  assert.equal(read?.key, first.key);
});

test("cats registry summary cache evicts oldest entries when bounded", () => {
  const cache = new CatsRegistrySummaryCache({ ttlMs: 60_000, maxEntries: 2 });
  cache.set("k1", "v1");
  cache.set("k2", "v2");
  cache.set("k3", "v3");

  assert.equal(cache.get("k1"), null);
  assert.equal(cache.get("k2")?.summary, "v2");
  assert.equal(cache.get("k3")?.summary, "v3");
});
