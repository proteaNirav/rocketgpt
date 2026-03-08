import fs from "node:fs";
import path from "node:path";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const store = new Map();
let loaded = false;
let lastFullPruneAtMs = 0;
const FULL_PRUNE_INTERVAL_MS = 5 * 60 * 1000;

function nowMs() {
  return Date.now();
}

function repoRootFromCwd() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cursor, "rocketgpt_v3_full")) || fs.existsSync(path.join(cursor, "cats"))) {
      return cursor;
    }
    const next = path.resolve(cursor, "..");
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function filePath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "intelligence-chat-overrides.json");
}

function keyOf(tenantId, chatId) {
  return `${String(tenantId || "demo-tenant")}::${String(chatId || "default-chat")}`;
}

function loadStoreIfNeeded() {
  if (loaded) return;
  loaded = true;
  const fp = filePath();
  try {
    const payload = JSON.parse(fs.readFileSync(fp, "utf8"));
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    for (const entry of entries) {
      if (!entry?.key || !entry?.value) continue;
      store.set(entry.key, entry.value);
    }
  } catch {
    // local/dev: no persisted store yet
  }
}

function persistStore() {
  const fp = filePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const entries = Array.from(store.entries()).map(([key, value]) => ({ key, value }));
  fs.writeFileSync(fp, JSON.stringify({ entries }, null, 2), "utf8");
}

function mergeUnique(existing = [], incoming = []) {
  return Array.from(new Set([...existing, ...incoming].filter(Boolean)));
}

function normalizeWeights(weights) {
  if (!weights || typeof weights !== "object") return null;
  const q = Number(weights.question ?? 0.2);
  const c = Number(weights.cat ?? 0.35);
  const w = Number(weights.workflow ?? 0.25);
  const p = Number(weights.platform ?? 0.2);
  const sum = q + c + w + p;
  if (sum <= 0) return null;
  return {
    question: q / sum,
    cat: c / sum,
    workflow: w / sum,
    platform: p / sum,
  };
}

function pruneExpired(ts = nowMs()) {
  let mutated = false;
  for (const [key, value] of store.entries()) {
    if (Number(value?.expiresAtMs || 0) <= ts) {
      store.delete(key);
      mutated = true;
    }
  }
  if (mutated) persistStore();
}

function maybePruneExpired(ts = nowMs()) {
  if (ts - lastFullPruneAtMs < FULL_PRUNE_INTERVAL_MS) return;
  lastFullPruneAtMs = ts;
  pruneExpired(ts);
}

export function getOverrides(tenantId, chatId) {
  loadStoreIfNeeded();
  maybePruneExpired();
  const key = keyOf(tenantId, chatId);
  const value = store.get(key) || null;
  if (!value) return null;
  if (Number(value.expiresAtMs || 0) > nowMs()) return value;
  store.delete(key);
  persistStore();
  return null;
}

export function setOverride(tenantId, chatId, patch, ttlMs = DEFAULT_TTL_MS) {
  loadStoreIfNeeded();
  maybePruneExpired();

  const ts = nowMs();
  const key = keyOf(tenantId, chatId);
  const prev = store.get(key) || null;

  const next = {
    tenantId: String(tenantId || "demo-tenant"),
    chatId: String(chatId || "default-chat"),
    revision: Number(prev?.revision || 0) + 1,
    avoidCatIds: mergeUnique(prev?.avoidCatIds || [], patch?.avoidCatIds || []),
    maxNodes: Number.isInteger(patch?.maxNodes)
      ? Math.max(1, Math.min(8, Number(patch.maxNodes)))
      : Number.isInteger(prev?.maxNodes)
        ? prev.maxNodes
        : undefined,
    scoringWeights: normalizeWeights(patch?.scoringWeights) || prev?.scoringWeights || undefined,
    forceFastUntilMs: Number.isFinite(patch?.forceFastUntilMs)
      ? Number(patch.forceFastUntilMs)
      : Number(prev?.forceFastUntilMs || 0),
    timeoutDowngrades: Number(prev?.timeoutDowngrades || 0) + (patch?.timeoutDowngradeApplied ? 1 : 0),
    updatedAtMs: ts,
    expiresAtMs: ts + Math.max(1, Number(ttlMs || DEFAULT_TTL_MS)),
  };

  store.set(key, next);
  persistStore();
  return next;
}

export function clearOverrides(tenantId, chatId) {
  loadStoreIfNeeded();
  maybePruneExpired();
  const key = keyOf(tenantId, chatId);
  store.delete(key);
  persistStore();
}

export function applyOverrides(planResult, overrides, runtimeHints = {}) {
  if (!overrides) {
    return {
      ...planResult,
      overrideHit: false,
      fallbackApplied: false,
    };
  }

  const workflowPlan = { ...planResult.workflowPlan };
  let nodes = Array.isArray(workflowPlan.nodes) ? [...workflowPlan.nodes] : [];
  let fallbackApplied = false;

  if (Array.isArray(overrides.avoidCatIds) && overrides.avoidCatIds.length > 0) {
    const before = nodes.length;
    nodes = nodes.filter((node) => !overrides.avoidCatIds.includes(node.catId));
    if (nodes.length < before) {
      fallbackApplied = true;
    }
  }

  if (Number.isInteger(overrides.maxNodes) && overrides.maxNodes > 0 && nodes.length > overrides.maxNodes) {
    nodes = nodes.slice(0, overrides.maxNodes);
    fallbackApplied = true;
  }

  const edges = [];
  for (let i = 1; i < nodes.length; i += 1) {
    edges.push({
      fromNodeId: nodes[i - 1].nodeId,
      toNodeId: nodes[i].nodeId,
      reason: "session override sequence",
    });
  }

  workflowPlan.nodes = nodes;
  workflowPlan.edges = edges;

  if (Number(overrides.forceFastUntilMs || 0) > nowMs() && workflowPlan.requiresResearch) {
    workflowPlan.requiresResearch = false;
    fallbackApplied = true;
  }

  if (runtimeHints?.timeoutMs && Number(runtimeHints.timeoutMs) >= 1500 && workflowPlan.requiresResearch) {
    workflowPlan.requiresResearch = false;
    fallbackApplied = true;
  }

  return {
    ...planResult,
    workflowPlan,
    requiresResearch: workflowPlan.requiresResearch,
    overrideHit: true,
    fallbackApplied,
  };
}
