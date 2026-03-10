import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { applyOverrides, getOverrides } from "./overrides-store.mjs";

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const cache = new Map();
const telemetryBuffer = [];
const MAX_TELEMETRY_BUFFER = 200;
let totalPlans = 0;
let totalOverrideHits = 0;

const RESEARCH_HINTS = [
  "latest",
  "today",
  "current",
  "news",
  "price",
  "regulation",
  "law",
  "market",
  "compare",
  "benchmark",
];

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return Number(value.toFixed(3));
}

function clampScore100(value) {
  if (value <= 0) return 0;
  if (value >= 100) return 100;
  return Math.round(value);
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function repoRootFromCwd() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cursor, "cats", "definitions"))) {
      return cursor;
    }
    const next = path.resolve(cursor, "..");
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function loadCatsReadModel() {
  const repoRoot = repoRootFromCwd();
  const defsDir = path.join(repoRoot, "cats", "definitions");
  const files = fs.existsSync(defsDir)
    ? fs.readdirSync(defsDir).filter((f) => f.endsWith(".json"))
    : [];
  const out = [];
  for (const file of files) {
    try {
      const payload = JSON.parse(fs.readFileSync(path.join(defsDir, file), "utf8"));
      const tags = Array.isArray(payload.tags) ? payload.tags.map((t) => String(t).toLowerCase()) : [];
      out.push({
        catId: String(payload.cat_id || ""),
        version: String(payload.version || "0.0.0"),
        tags,
        inputsSig: payload.inputs_schema ? sha256(JSON.stringify(payload.inputs_schema)) : null,
        outputsSig: payload.outputs_schema ? sha256(JSON.stringify(payload.outputs_schema)) : null,
        avgLatency: null,
        successRate: null,
        trustTier: String(payload.trust_tier || payload.trustTier || "standard").toLowerCase(),
        updatedAt: String(payload.updated_at || payload.updatedAt || payload.created_at_utc || "1970-01-01T00:00:00.000Z"),
        canonicalName: String(payload.canonical_name || ""),
        name: String(payload.name || ""),
        description: String(payload.description || ""),
        type: String(payload.type || "general").toLowerCase(),
      });
    } catch {
      // keep module resilient; bad CAT definitions are skipped
    }
  }
  return out;
}

const CATS_READ_MODEL = loadCatsReadModel();

function buildCatsCapabilityIndexSummary(cats = CATS_READ_MODEL) {
  const categories = {};
  const tagCounts = {};
  for (const cat of cats) {
    const category = String(cat.canonicalName.split("/")[1] || "general");
    categories[category] = (categories[category] || 0) + 1;
    for (const tag of cat.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const version = sha256(
    cats
      .map((c) => `${c.catId}|${c.version}|${c.trustTier}|${c.updatedAt}`)
      .sort()
      .join(";")
  ).slice(0, 16);

  return {
    version,
    totalCats: cats.length,
    categories,
    topTags: Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag]) => tag),
  };
}

const CATS_INDEX_SUMMARY = buildCatsCapabilityIndexSummary(CATS_READ_MODEL);

function suggestCats(prompt, cats, trustTierHint = null) {
  const tokens = new Set(tokenize(prompt));
  const scored = [];
  for (const cat of cats) {
    let score = 0;
    const reasons = [];
    const fullText = `${cat.name} ${cat.canonicalName} ${cat.description}`.toLowerCase();
    for (const token of tokens) {
      if (cat.tags.includes(token)) {
        score += 9;
        reasons.push(`tag:${token}`);
      } else if (fullText.includes(token)) {
        score += 4;
        reasons.push(`keyword:${token}`);
      }
    }
    if (tokens.has(cat.type)) {
      score += 6;
      reasons.push(`type:${cat.type}`);
    }
    if (trustTierHint && cat.trustTier === trustTierHint) {
      score += 5;
      reasons.push(`trust:${trustTierHint}`);
    }
    if (score > 0) {
      scored.push({
        item: cat,
        score,
        reason: reasons.slice(0, 3).join(", "),
      });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
}

function shouldRequireResearch(prompt, topSuggestions) {
  const normalized = String(prompt || "").toLowerCase();
  const hasResearchHint = RESEARCH_HINTS.some((hint) => normalized.includes(hint));
  const weakRoutingSignal = !topSuggestions.length || topSuggestions[0].score < 10;
  return hasResearchHint && weakRoutingSignal;
}

function buildNodesAndEdges(suggestions) {
  const nodes = suggestions.slice(0, 4).map((entry, index) => {
    const category = String(entry.item.canonicalName.split("/")[1] || "general");
    return {
      nodeId: `node-${index + 1}`,
      catId: entry.item.catId,
      catName: entry.item.name,
      category,
      reason: entry.reason || "capability fit",
      score: entry.score,
    };
  });

  const edges = [];
  for (let i = 1; i < nodes.length; i += 1) {
    edges.push({
      fromNodeId: nodes[i - 1].nodeId,
      toNodeId: nodes[i].nodeId,
      reason: "priority sequence",
    });
  }
  return { nodes, edges };
}

function computeScorecard(prompt, suggestions, requiresResearch) {
  const tokens = tokenize(prompt);
  const questionIQ = clampScore100(45 + Math.min(tokens.length, 25) * 2);
  const catIQ =
    suggestions.length === 0
      ? 30
      : clampScore100(
          suggestions.reduce((sum, s) => sum + Math.min(100, s.score * 5), 0) / suggestions.length
        );
  const workflowIQ = clampScore100(60 + Math.min(suggestions.length, 4) * 8 - (requiresResearch ? 12 : 0));
  const platformIQ = requiresResearch ? 72 : 88;
  const signals = [
    `cats_index_version:${CATS_INDEX_SUMMARY.version}`,
    `routing_candidates:${suggestions.length}`,
    requiresResearch ? "research_gate:enabled" : "research_gate:disabled",
  ];
  return {
    questionIQ,
    catIQ,
    workflowIQ,
    platformIQ,
    signals,
  };
}

function normalizeWeights(weights) {
  if (!weights) return { question: 0.2, cat: 0.35, workflow: 0.25, platform: 0.2 };
  const q = Number(weights.question ?? 0.2);
  const c = Number(weights.cat ?? 0.35);
  const w = Number(weights.workflow ?? 0.25);
  const p = Number(weights.platform ?? 0.2);
  const sum = q + c + w + p;
  if (sum <= 0) return { question: 0.2, cat: 0.35, workflow: 0.25, platform: 0.2 };
  return { question: q / sum, cat: c / sum, workflow: w / sum, platform: p / sum };
}

function computeConfidence(scorecard, requiresResearch, selectedCount, weights) {
  const w = normalizeWeights(weights);
  const weighted =
    scorecard.questionIQ * w.question +
    scorecard.catIQ * w.cat +
    scorecard.workflowIQ * w.workflow +
    scorecard.platformIQ * w.platform;
  const scoreNorm = weighted / 100;
  const researchPenalty = requiresResearch ? 0.16 : 0;
  const lowNodePenalty = selectedCount === 0 ? 0.22 : selectedCount === 1 ? 0.1 : 0;
  return clamp01(scoreNorm - researchPenalty - lowNodePenalty);
}

function makeCacheKey({ prompt, tenantId, chatContextHash, catsIndexVersion }) {
  return sha256(`${prompt}|${tenantId}|${chatContextHash}|${catsIndexVersion}`);
}

function computeChatContextHash(messages = []) {
  const context = Array.isArray(messages)
    ? messages
        .slice(-8)
        .map((m) => `${m.role || "unknown"}:${String(m.content || "").slice(0, 200)}`)
        .join("\n")
    : "";
  return sha256(context);
}

function getNowMs(inputNow) {
  return typeof inputNow === "number" ? inputNow : Date.now();
}

function buildPlanId(cacheKey) {
  return `plan_${cacheKey.slice(0, 12)}`;
}

export function clearIntelligenceCache() {
  cache.clear();
}

export function getIntelligenceTelemetryEvents() {
  return [...telemetryBuffer];
}

export function getCatsCapabilityIndexSummary() {
  return CATS_INDEX_SUMMARY;
}

export function buildFastWorkflowPlan(input, opts = {}) {
  const started = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  const prompt = String(input?.prompt || "").trim();
  const tenantId = String(input?.tenantId || "demo-tenant");
  const chatId = String(input?.chatId ?? input?.sessionId ?? "default-chat");
  const chatContextHash = input?.chatContextHash || computeChatContextHash(input?.messages || []);
  const cacheTtlMs = typeof opts.cacheTtlMs === "number" ? opts.cacheTtlMs : DEFAULT_TTL_MS;
  const now = getNowMs(opts.nowMs);
  const overrides = getOverrides(tenantId, chatId);
  const cacheKey = makeCacheKey({
    prompt,
    tenantId,
    chatContextHash,
    catsIndexVersion: CATS_INDEX_SUMMARY.version,
  });

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    const overridden = applyOverrides(cached.baseValue, overrides, {
      timeoutMs: Number(input?.timeoutMs || 0),
    });
    const latency = Math.max(0, Date.now() - started);
    totalPlans += 1;
    if (overridden.overrideHit) totalOverrideHits += 1;
    overridden.telemetry.override_hit = overridden.overrideHit;
    overridden.telemetry.fallback_applied = overridden.fallbackApplied;
    return {
      ...overridden,
      cacheHit: true,
      telemetry: {
        ...overridden.telemetry,
        plan_latency_ms: latency,
        cache_hit: true,
        cats_index_version: CATS_INDEX_SUMMARY.version,
        improvise_rate: totalPlans > 0 ? Number((totalOverrideHits / totalPlans).toFixed(4)) : 0,
      },
    };
  }

  const normalizedPrompt = prompt.toLowerCase();
  const trustTierHint = normalizedPrompt.includes("strict") || normalizedPrompt.includes("critical") ? "high" : null;
  const suggestions = suggestCats(prompt, CATS_READ_MODEL, trustTierHint);
  const requiresResearch = shouldRequireResearch(prompt, suggestions);
  const { nodes, edges } = buildNodesAndEdges(suggestions);
  const iqScorecard = computeScorecard(prompt, suggestions, requiresResearch);
  const confidence = computeConfidence(iqScorecard, requiresResearch, nodes.length, overrides?.scoringWeights);
  const workflowPlan = {
    planId: buildPlanId(cacheKey),
    nodes,
    edges,
    requiresResearch,
    confidence,
    rationaleSummary:
      nodes.length > 0
        ? `Selected ${nodes.length} CAT nodes from capability index ${CATS_INDEX_SUMMARY.version}.`
        : "No strong CAT match found from capability index; fallback workflow.",
  };

  const telemetry = {
    plan_latency_ms: Math.max(0, Date.now() - started),
    cache_hit: false,
    cats_selected_count: nodes.length,
    confidence,
    requiresResearch,
    cats_index_version: CATS_INDEX_SUMMARY.version,
    improvise_rate: 0,
    override_hit: false,
    fallback_applied: false,
  };

  const baseValue = {
    workflowPlan,
    iqScorecard,
    confidence,
    requiresResearch,
    telemetry,
    cacheHit: false,
  };
  const value = applyOverrides(baseValue, overrides, {
    timeoutMs: Number(input?.timeoutMs || 0),
  });
  totalPlans += 1;
  if (value.overrideHit) totalOverrideHits += 1;
  value.telemetry.override_hit = value.overrideHit;
  value.telemetry.fallback_applied = value.fallbackApplied;
  value.telemetry.requiresResearch = value.requiresResearch;
  value.telemetry.cats_selected_count = value.workflowPlan.nodes.length;
  value.telemetry.confidence = value.workflowPlan.confidence;
  value.telemetry.improvise_rate = totalPlans > 0 ? Number((totalOverrideHits / totalPlans).toFixed(4)) : 0;

  cache.set(cacheKey, {
    expiresAt: now + cacheTtlMs,
    baseValue,
  });

  telemetryBuffer.push({
    ts: new Date().toISOString(),
    ...telemetry,
  });
  if (telemetryBuffer.length > MAX_TELEMETRY_BUFFER) {
    telemetryBuffer.shift();
  }

  return value;
}
