import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_SOURCE_CAP = 10;
const MIN_SOURCE_CAP = 8;
const MAX_SOURCE_CAP = 12;
const DEFAULT_TIMEBOX_MS = 1200;

function nowIso() {
  return new Date().toISOString();
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
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

function storePath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "research-packs.json");
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return {
      packsById: parsed?.packsById && typeof parsed.packsById === "object" ? parsed.packsById : {},
      planToPackId: parsed?.planToPackId && typeof parsed.planToPackId === "object" ? parsed.planToPackId : {},
      cache: parsed?.cache && typeof parsed.cache === "object" ? parsed.cache : {},
    };
  } catch {
    return { packsById: {}, planToPackId: {}, cache: {} };
  }
}

function writeStore(store) {
  const fp = storePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(store, null, 2), "utf8");
}

function normalizeSourceCap(inputCap) {
  const cap = Number(inputCap || DEFAULT_SOURCE_CAP);
  if (!Number.isFinite(cap)) return DEFAULT_SOURCE_CAP;
  return Math.max(MIN_SOURCE_CAP, Math.min(MAX_SOURCE_CAP, Math.floor(cap)));
}

export function makeResearchCacheKey(input) {
  const query = String(input?.query || "").trim();
  const scope = String(input?.scope || "general").trim();
  const recencyWindow = String(input?.recencyWindow || "30d").trim();
  const allowlistVersion = String(input?.allowlistVersion || "v1").trim();
  return sha256(`${query}|${scope}|${recencyWindow}|${allowlistVersion}`);
}

function buildEvidenceRefs(query, sourceCap, timeboxMs) {
  const started = Date.now();
  const refs = [];
  for (let i = 0; i < sourceCap; i += 1) {
    if (Date.now() - started >= timeboxMs) break;
    const id = `src-${i + 1}`;
    const uri = `https://evidence.local/${encodeURIComponent(query || "general")}/${i + 1}`;
    const checksum = sha256(`${query}|${uri}`);
    refs.push({
      id,
      uri,
      media_type: "text/plain",
      bytes: 512 + i,
      checksum_sha256: checksum,
    });
  }
  return refs;
}

export function getEvidencePackByPlanId(planId) {
  const store = readStore();
  const packId = store.planToPackId[String(planId || "")];
  if (!packId) return null;
  return store.packsById[packId] || null;
}

export function getEvidencePackById(packId) {
  const store = readStore();
  return store.packsById[String(packId || "")] || null;
}

export function clearResearchStoreForTests() {
  try {
    fs.unlinkSync(storePath());
  } catch {
    // ignore
  }
}

export function buildEvidencePack(input) {
  const planId = String(input?.planId || "").trim();
  const query = String(input?.query || "").trim();
  const scope = String(input?.scope || "general").trim();
  const recencyWindow = String(input?.recencyWindow || "30d").trim();
  const allowlistVersion = String(input?.allowlistVersion || "v1").trim();
  const sourceCap = normalizeSourceCap(input?.sourceCap);
  const timeboxMs = Math.max(100, Number(input?.timeboxMs || DEFAULT_TIMEBOX_MS));
  const cacheKey = makeResearchCacheKey({
    query,
    scope,
    recencyWindow,
    allowlistVersion,
  });

  const store = readStore();
  const cachedPackId = store.cache[cacheKey];
  if (cachedPackId && store.packsById[cachedPackId]) {
    const cached = {
      ...store.packsById[cachedPackId],
      cache_hit: true,
      plan_id: planId || store.packsById[cachedPackId].plan_id || null,
    };
    if (planId) {
      store.planToPackId[planId] = cached.pack_id;
      store.packsById[cached.pack_id] = cached;
      writeStore(store);
    }
    return cached;
  }

  const started = Date.now();
  const evidenceRefs = buildEvidenceRefs(query, sourceCap, timeboxMs);
  const elapsedMs = Date.now() - started;
  const partial = evidenceRefs.length < sourceCap;
  const packId = `evp_${sha256(`${cacheKey}|${nowIso()}`).slice(0, 16)}`;
  const summary = partial
    ? `Partial EvidencePack built (${evidenceRefs.length}/${sourceCap} sources) within timebox.`
    : `EvidencePack built with ${evidenceRefs.length} sources.`;

  const pack = {
    version: "1.0",
    pack_id: packId,
    session_id: String(input?.sessionId || input?.chatId || "default-session"),
    plan_id: planId || null,
    summary,
    generated_at: nowIso(),
    evidence_refs: evidenceRefs,
    query,
    scope,
    recency_window: recencyWindow,
    allowlist_version: allowlistVersion,
    source_cap: sourceCap,
    partial,
    build_ms: elapsedMs,
    cache_hit: false,
    cache_key: cacheKey,
  };

  store.packsById[packId] = pack;
  store.cache[cacheKey] = packId;
  if (planId) store.planToPackId[planId] = packId;
  writeStore(store);
  return pack;
}

