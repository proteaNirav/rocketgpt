import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

export type LearningSourceKind = "rss" | "chat";
export type LearningItemStatus = "proposed" | "approved" | "published" | "rejected" | "revoked" | "deprecated";
export type LearningReviewDecision = "approve" | "reject" | "publish" | "revoke" | "deprecate";

export type LearningSourceRow = {
  id: string;
  tenant_id: string;
  kind: LearningSourceKind;
  name: string;
  source_url: string | null;
  enabled: boolean;
  interval_minutes: number;
  created_by_user_id: string | null;
  last_run_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningItemRow = {
  id: string;
  tenant_id: string;
  source_id: string | null;
  source_kind: LearningSourceKind;
  source_ref: string | null;
  title: string;
  sanitized_content: string;
  content_sha256: string;
  provenance_json: Record<string, unknown>;
  status: LearningItemStatus;
  proposed_by_user_id: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  published_at: string | null;
  revoked_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type LearningTopicRow = {
  id: string;
  tenant_id: string;
  topic_key: string;
  display_name: string;
  created_at: string;
};

export type LearningLibraryPathRow = {
  id: string;
  tenant_id: string;
  item_id: string;
  library_id: string;
  file_path: string;
  content_sha256: string;
  published_version: number;
  created_at: string;
  updated_at: string;
};

let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase server credentials.");
  }
  supabaseAdminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseAdminClient;
}

function isInMemoryEnabled(): boolean {
  if (process.env.LEARNING_INMEMORY === "1") return true;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !url || !key;
}

type InMemState = {
  settings: Array<{
    tenant_id: string;
    chat_learning_opt_out: boolean;
    allow_user_chat_proposals: boolean;
    created_at: string;
    updated_at: string;
  }>;
  sources: LearningSourceRow[];
  items: LearningItemRow[];
  topics: LearningTopicRow[];
  itemTopics: Array<{ id: string; tenant_id: string; item_id: string; topic_id: string; created_at: string }>;
  reviews: Array<{
    id: string;
    tenant_id: string;
    item_id: string;
    decision: LearningReviewDecision;
    rationale: string | null;
    actor_user_id: string | null;
    before_status: LearningItemStatus;
    after_status: LearningItemStatus;
    created_at: string;
  }>;
  paths: LearningLibraryPathRow[];
  redactions: Array<{
    id: string;
    tenant_id: string;
    item_id: string;
    redaction_count: number;
    redaction_kinds: string[];
    created_at: string;
  }>;
  runs: Array<{
    id: string;
    tenant_id: string;
    source_id: string | null;
    status: "started" | "success" | "failed" | "partial";
    fetched_count: number;
    proposed_count: number;
    error_text: string | null;
    started_at: string;
    finished_at: string | null;
    created_at: string;
  }>;
};

function inMemoryFilePath(): string {
  return path.join(process.cwd(), ".next", "cache", "learning-inmemory.json");
}

function readState(): InMemState {
  const file = inMemoryFilePath();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      settings: Array.isArray(parsed?.settings) ? parsed.settings : [],
      sources: Array.isArray(parsed?.sources) ? parsed.sources : [],
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      topics: Array.isArray(parsed?.topics) ? parsed.topics : [],
      itemTopics: Array.isArray(parsed?.itemTopics) ? parsed.itemTopics : [],
      reviews: Array.isArray(parsed?.reviews) ? parsed.reviews : [],
      paths: Array.isArray(parsed?.paths) ? parsed.paths : [],
      redactions: Array.isArray(parsed?.redactions) ? parsed.redactions : [],
      runs: Array.isArray(parsed?.runs) ? parsed.runs : [],
    };
  } catch {
    return {
      settings: [],
      sources: [],
      items: [],
      topics: [],
      itemTopics: [],
      reviews: [],
      paths: [],
      redactions: [],
      runs: [],
    };
  }
}

function writeState(next: InMemState): void {
  const file = inMemoryFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(next), "utf8");
}

function id(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function ensureLearningSettings(tenantId: string): Promise<{
  tenant_id: string;
  chat_learning_opt_out: boolean;
  allow_user_chat_proposals: boolean;
}> {
  if (isInMemoryEnabled()) {
    const state = readState();
    let row = state.settings.find((x) => x.tenant_id === tenantId);
    if (!row) {
      row = {
        tenant_id: tenantId,
        chat_learning_opt_out: false,
        allow_user_chat_proposals: true,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      state.settings.push(row);
      writeState(state);
    }
    return row;
  }
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("learning_settings")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  const inserted = await supabase
    .from("learning_settings")
    .insert({ tenant_id: tenantId })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data;
}

export async function listLearningSources(tenantId: string): Promise<LearningSourceRow[]> {
  if (isInMemoryEnabled()) {
    return readState()
      .sources.filter((x) => x.tenant_id === tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as LearningSourceRow[];
}

export async function getLearningSourceById(tenantId: string, sourceId: string): Promise<LearningSourceRow | null> {
  if (isInMemoryEnabled()) {
    return readState().sources.find((x) => x.tenant_id === tenantId && x.id === sourceId) ?? null;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_sources")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", sourceId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningSourceRow | null;
}

export async function createLearningSource(input: {
  tenantId: string;
  kind: LearningSourceKind;
  name: string;
  sourceUrl: string | null;
  enabled: boolean;
  intervalMinutes: number;
  createdByUserId: string | null;
}): Promise<LearningSourceRow> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const row: LearningSourceRow = {
      id: id(),
      tenant_id: input.tenantId,
      kind: input.kind,
      name: input.name,
      source_url: input.sourceUrl,
      enabled: input.enabled,
      interval_minutes: input.intervalMinutes,
      created_by_user_id: input.createdByUserId,
      last_run_at: null,
      last_error: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.sources.push(row);
    writeState(state);
    return row;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_sources")
    .insert({
      tenant_id: input.tenantId,
      kind: input.kind,
      name: input.name,
      source_url: input.sourceUrl,
      enabled: input.enabled,
      interval_minutes: input.intervalMinutes,
      created_by_user_id: input.createdByUserId,
    })
    .select("*")
    .single();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningSourceRow;
}

export async function updateLearningSource(input: {
  tenantId: string;
  sourceId: string;
  patch: Partial<{
    name: string;
    source_url: string | null;
    enabled: boolean;
    interval_minutes: number;
    last_run_at: string | null;
    last_error: string | null;
  }>;
}): Promise<LearningSourceRow | null> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const row = state.sources.find((x) => x.tenant_id === input.tenantId && x.id === input.sourceId);
    if (!row) return null;
    Object.assign(row, input.patch);
    row.updated_at = nowIso();
    writeState(state);
    return row;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_sources")
    .update(input.patch)
    .eq("tenant_id", input.tenantId)
    .eq("id", input.sourceId)
    .select("*")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningSourceRow | null;
}

export async function createOrGetLearningItem(input: {
  tenantId: string;
  sourceId: string | null;
  sourceKind: LearningSourceKind;
  sourceRef: string | null;
  title: string;
  sanitizedContent: string;
  contentSha256: string;
  provenanceJson: Record<string, unknown>;
  proposedByUserId: string | null;
}): Promise<{ item: LearningItemRow; deduped: boolean }> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const existing = state.items.find((x) => x.tenant_id === input.tenantId && x.content_sha256 === input.contentSha256);
    if (existing) return { item: existing, deduped: true };
    const row: LearningItemRow = {
      id: id(),
      tenant_id: input.tenantId,
      source_id: input.sourceId,
      source_kind: input.sourceKind,
      source_ref: input.sourceRef,
      title: input.title,
      sanitized_content: input.sanitizedContent,
      content_sha256: input.contentSha256,
      provenance_json: input.provenanceJson,
      status: "proposed",
      proposed_by_user_id: input.proposedByUserId,
      approved_by_user_id: null,
      approved_at: null,
      published_at: null,
      revoked_at: null,
      rejection_reason: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.items.push(row);
    writeState(state);
    return { item: row, deduped: false };
  }
  const supabase = getSupabaseAdminClient();
  const existing = await supabase
    .from("learning_items")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("content_sha256", input.contentSha256)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { item: existing.data as LearningItemRow, deduped: true };

  const inserted = await supabase
    .from("learning_items")
    .insert({
      tenant_id: input.tenantId,
      source_id: input.sourceId,
      source_kind: input.sourceKind,
      source_ref: input.sourceRef,
      title: input.title,
      sanitized_content: input.sanitizedContent,
      content_sha256: input.contentSha256,
      provenance_json: input.provenanceJson,
      proposed_by_user_id: input.proposedByUserId,
    })
    .select("*")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return { item: inserted.data as LearningItemRow, deduped: false };
}

export async function listLearningItems(input: {
  tenantId: string;
  status?: LearningItemStatus;
  limit?: number;
}): Promise<LearningItemRow[]> {
  const limit = input.limit ?? 100;
  if (isInMemoryEnabled()) {
    let rows = readState().items.filter((x) => x.tenant_id === input.tenantId);
    if (input.status) rows = rows.filter((x) => x.status === input.status);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("learning_items")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (input.status) query = query.eq("status", input.status);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as LearningItemRow[];
}

export async function getLearningItemById(tenantId: string, itemId: string): Promise<LearningItemRow | null> {
  if (isInMemoryEnabled()) {
    return readState().items.find((x) => x.tenant_id === tenantId && x.id === itemId) ?? null;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningItemRow | null;
}

export async function transitionLearningItem(input: {
  tenantId: string;
  itemId: string;
  nextStatus: LearningItemStatus;
  actorUserId: string | null;
  rationale?: string | null;
  decision: LearningReviewDecision;
}): Promise<LearningItemRow | null> {
  const now = nowIso();
  if (isInMemoryEnabled()) {
    const state = readState();
    const row = state.items.find((x) => x.tenant_id === input.tenantId && x.id === input.itemId);
    if (!row) return null;
    const before = row.status;
    row.status = input.nextStatus;
    if (input.nextStatus === "approved") {
      row.approved_at = now;
      row.approved_by_user_id = input.actorUserId;
    }
    if (input.nextStatus === "published") row.published_at = now;
    if (input.nextStatus === "revoked" || input.nextStatus === "deprecated") row.revoked_at = now;
    if (input.nextStatus === "rejected") row.rejection_reason = input.rationale ?? null;
    row.updated_at = now;
    state.reviews.push({
      id: id(),
      tenant_id: input.tenantId,
      item_id: input.itemId,
      decision: input.decision,
      rationale: input.rationale ?? null,
      actor_user_id: input.actorUserId,
      before_status: before,
      after_status: input.nextStatus,
      created_at: now,
    });
    writeState(state);
    return row;
  }
  const current = await getLearningItemById(input.tenantId, input.itemId);
  if (!current) return null;
  const patch: Record<string, unknown> = { status: input.nextStatus };
  if (input.nextStatus === "approved") {
    patch.approved_at = now;
    patch.approved_by_user_id = input.actorUserId;
  }
  if (input.nextStatus === "published") patch.published_at = now;
  if (input.nextStatus === "revoked" || input.nextStatus === "deprecated") patch.revoked_at = now;
  if (input.nextStatus === "rejected") patch.rejection_reason = input.rationale ?? null;

  const supabase = getSupabaseAdminClient();
  const updated = await supabase
    .from("learning_items")
    .update(patch)
    .eq("tenant_id", input.tenantId)
    .eq("id", input.itemId)
    .select("*")
    .maybeSingle();
  if (updated.error) throw new Error(updated.error.message);
  if (!updated.data) return null;

  const reviewInsert = await supabase.from("learning_reviews").insert({
    tenant_id: input.tenantId,
    item_id: input.itemId,
    decision: input.decision,
    rationale: input.rationale ?? null,
    actor_user_id: input.actorUserId,
    before_status: current.status,
    after_status: input.nextStatus,
  });
  if (reviewInsert.error) throw new Error(reviewInsert.error.message);
  return updated.data as LearningItemRow;
}

export async function upsertLearningTopicsForItem(input: {
  tenantId: string;
  itemId: string;
  topics: string[];
}): Promise<void> {
  const topics = [...new Set(input.topics.map((x) => x.trim().toLowerCase()).filter(Boolean))];
  if (topics.length === 0) return;
  if (isInMemoryEnabled()) {
    const state = readState();
    for (const topicKey of topics) {
      let topic = state.topics.find((x) => x.tenant_id === input.tenantId && x.topic_key === topicKey);
      if (!topic) {
        topic = {
          id: id(),
          tenant_id: input.tenantId,
          topic_key: topicKey,
          display_name: topicKey.replace(/-/g, " "),
          created_at: nowIso(),
        };
        state.topics.push(topic);
      }
      const mapped = state.itemTopics.find((m) => m.item_id === input.itemId && m.topic_id === topic.id);
      if (!mapped) {
        state.itemTopics.push({
          id: id(),
          tenant_id: input.tenantId,
          item_id: input.itemId,
          topic_id: topic.id,
          created_at: nowIso(),
        });
      }
    }
    writeState(state);
    return;
  }

  const supabase = getSupabaseAdminClient();
  for (const topicKey of topics) {
    const upsert = await supabase
      .from("learning_topics")
      .upsert(
        {
          tenant_id: input.tenantId,
          topic_key: topicKey,
          display_name: topicKey.replace(/-/g, " "),
        },
        { onConflict: "tenant_id,topic_key" }
      )
      .select("*")
      .single();
    if (upsert.error) throw new Error(upsert.error.message);
    const topicId = (upsert.data as LearningTopicRow).id;
    const mapInsert = await supabase.from("learning_item_topics").upsert(
      {
        tenant_id: input.tenantId,
        item_id: input.itemId,
        topic_id: topicId,
      },
      { onConflict: "item_id,topic_id" }
    );
    if (mapInsert.error) throw new Error(mapInsert.error.message);
  }
}

export async function listTopicsForItem(tenantId: string, itemId: string): Promise<string[]> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const topicIds = state.itemTopics.filter((x) => x.tenant_id === tenantId && x.item_id === itemId).map((x) => x.topic_id);
    return state.topics.filter((x) => topicIds.includes(x.id)).map((x) => x.topic_key).sort();
  }
  const supabase = getSupabaseAdminClient();
  const mapped = await supabase
    .from("learning_item_topics")
    .select("topic_id")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId);
  if (mapped.error) throw new Error(mapped.error.message);
  const topicIds = (mapped.data ?? []).map((x: any) => x.topic_id);
  if (topicIds.length === 0) return [];
  const topics = await supabase.from("learning_topics").select("topic_key").eq("tenant_id", tenantId).in("id", topicIds);
  if (topics.error) throw new Error(topics.error.message);
  return (topics.data ?? []).map((x: any) => String(x.topic_key)).sort();
}

export async function upsertLearningLibraryPath(input: {
  tenantId: string;
  itemId: string;
  libraryId: string;
  filePath: string;
  contentSha256: string;
}): Promise<LearningLibraryPathRow> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const existing = state.paths.find((x) => x.tenant_id === input.tenantId && x.item_id === input.itemId);
    if (existing) {
      existing.library_id = input.libraryId;
      existing.file_path = input.filePath;
      existing.content_sha256 = input.contentSha256;
      existing.published_version += 1;
      existing.updated_at = nowIso();
      writeState(state);
      return existing;
    }
    const row: LearningLibraryPathRow = {
      id: id(),
      tenant_id: input.tenantId,
      item_id: input.itemId,
      library_id: input.libraryId,
      file_path: input.filePath,
      content_sha256: input.contentSha256,
      published_version: 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    state.paths.push(row);
    writeState(state);
    return row;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_library_paths")
    .upsert(
      {
        tenant_id: input.tenantId,
        item_id: input.itemId,
        library_id: input.libraryId,
        file_path: input.filePath,
        content_sha256: input.contentSha256,
      },
      { onConflict: "item_id" }
    )
    .select("*")
    .single();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningLibraryPathRow;
}

export async function getLearningLibraryPath(tenantId: string, itemId: string): Promise<LearningLibraryPathRow | null> {
  if (isInMemoryEnabled()) {
    return readState().paths.find((x) => x.tenant_id === tenantId && x.item_id === itemId) ?? null;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_library_paths")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data as LearningLibraryPathRow | null;
}

export async function listPublishedLearningItems(tenantId: string): Promise<Array<{ item: LearningItemRow; path: LearningLibraryPathRow | null }>> {
  const items = await listLearningItems({ tenantId, status: "published", limit: 200 });
  const out: Array<{ item: LearningItemRow; path: LearningLibraryPathRow | null }> = [];
  for (const item of items) {
    out.push({ item, path: await getLearningLibraryPath(tenantId, item.id) });
  }
  return out;
}

export async function insertRedactionAudit(input: {
  tenantId: string;
  itemId: string;
  redactionCount: number;
  redactionKinds: string[];
}): Promise<void> {
  if (isInMemoryEnabled()) {
    const state = readState();
    state.redactions.push({
      id: id(),
      tenant_id: input.tenantId,
      item_id: input.itemId,
      redaction_count: input.redactionCount,
      redaction_kinds: input.redactionKinds,
      created_at: nowIso(),
    });
    writeState(state);
    return;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase.from("learning_redaction_audit").insert({
    tenant_id: input.tenantId,
    item_id: input.itemId,
    redaction_count: input.redactionCount,
    redaction_kinds: input.redactionKinds,
  });
  if (result.error) throw new Error(result.error.message);
}

export async function startLearningIngestRun(input: {
  tenantId: string;
  sourceId: string | null;
}): Promise<{ id: string }> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const row = {
      id: id(),
      tenant_id: input.tenantId,
      source_id: input.sourceId,
      status: "started" as const,
      fetched_count: 0,
      proposed_count: 0,
      error_text: null,
      started_at: nowIso(),
      finished_at: null,
      created_at: nowIso(),
    };
    state.runs.push(row);
    writeState(state);
    return { id: row.id };
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_ingest_runs")
    .insert({
      tenant_id: input.tenantId,
      source_id: input.sourceId,
      status: "started",
    })
    .select("id")
    .single();
  if (result.error) throw new Error(result.error.message);
  return { id: result.data.id };
}

export async function finishLearningIngestRun(input: {
  runId: string;
  tenantId: string;
  status: "success" | "failed" | "partial";
  fetchedCount: number;
  proposedCount: number;
  errorText: string | null;
}): Promise<void> {
  if (isInMemoryEnabled()) {
    const state = readState();
    const row = state.runs.find((x) => x.id === input.runId && x.tenant_id === input.tenantId);
    if (row) {
      row.status = input.status;
      row.fetched_count = input.fetchedCount;
      row.proposed_count = input.proposedCount;
      row.error_text = input.errorText;
      row.finished_at = nowIso();
    }
    writeState(state);
    return;
  }
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("learning_ingest_runs")
    .update({
      status: input.status,
      fetched_count: input.fetchedCount,
      proposed_count: input.proposedCount,
      error_text: input.errorText,
      finished_at: nowIso(),
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.runId);
  if (result.error) throw new Error(result.error.message);
}
