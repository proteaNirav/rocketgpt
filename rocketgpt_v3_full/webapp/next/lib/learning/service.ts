import { appendGovernanceLedgerEvent } from "@/lib/db/governanceRepo";
import {
  createOrGetLearningItem,
  ensureLearningSettings,
  finishLearningIngestRun,
  getLearningItemById,
  getLearningSourceById,
  insertRedactionAudit,
  listLearningItems,
  listPublishedLearningItems,
  listTopicsForItem,
  startLearningIngestRun,
  transitionLearningItem,
  upsertLearningLibraryPath,
  upsertLearningTopicsForItem,
  updateLearningSource,
  type LearningItemStatus,
  type LearningReviewDecision,
} from "@/lib/db/learningRepo";
import { publishLearningMarkdown, refreshLibraryIndexes } from "@/lib/learning/library-publisher";
import { redactLearningText, sha256Hex } from "@/lib/learning/redaction";
import { parseRssEntries } from "@/lib/learning/rss";
import { slugifyTitle, deriveTopicsFromText } from "@/lib/learning/topics";
import { canTransitionLearningStatus } from "@/lib/learning/types";

async function writeLearningLedger(payload: Record<string, unknown>, action: string): Promise<void> {
  try {
    await appendGovernanceLedgerEvent({
      eventType: action === "publish" || action === "revoke" || action === "deprecate" ? "containment_applied" : "risk_eval",
      workflowId: "learning.pipeline",
      runId: null,
      crpsId: null,
      payload,
    });
  } catch {
    // best-effort
  }
}

export async function proposeLearningItem(input: {
  tenantId: string;
  sourceId: string | null;
  sourceKind: "rss" | "chat";
  sourceRef: string | null;
  title: string;
  rawContent: string;
  proposedByUserId: string | null;
  provenance: Record<string, unknown>;
}): Promise<{ itemId: string; deduped: boolean; status: LearningItemStatus }> {
  const redacted = redactLearningText(input.rawContent);
  const contentSha256 = sha256Hex(redacted.sanitized);

  const created = await createOrGetLearningItem({
    tenantId: input.tenantId,
    sourceId: input.sourceId,
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
    title: input.title,
    sanitizedContent: redacted.sanitized,
    contentSha256,
    provenanceJson: input.provenance,
    proposedByUserId: input.proposedByUserId,
  });

  if (!created.deduped) {
    const topics = deriveTopicsFromText(input.title, redacted.sanitized);
    await upsertLearningTopicsForItem({
      tenantId: input.tenantId,
      itemId: created.item.id,
      topics,
    });
    await insertRedactionAudit({
      tenantId: input.tenantId,
      itemId: created.item.id,
      redactionCount: redacted.redactionCount,
      redactionKinds: redacted.redactionKinds,
    });
  }

  await writeLearningLedger(
    {
      action: "propose",
      tenantId: input.tenantId,
      itemId: created.item.id,
      sourceKind: input.sourceKind,
      deduped: created.deduped,
      contentSha256,
      timestamp: new Date().toISOString(),
    },
    "propose"
  );
  return {
    itemId: created.item.id,
    deduped: created.deduped,
    status: created.item.status,
  };
}

function decisionToStatus(decision: LearningReviewDecision): LearningItemStatus {
  if (decision === "approve") return "approved";
  if (decision === "reject") return "rejected";
  if (decision === "publish") return "published";
  if (decision === "revoke") return "revoked";
  return "deprecated";
}

export async function reviewLearningItem(input: {
  tenantId: string;
  itemId: string;
  decision: LearningReviewDecision;
  rationale?: string | null;
  actorUserId: string | null;
}): Promise<{ id: string; status: LearningItemStatus }> {
  const current = await getLearningItemById(input.tenantId, input.itemId);
  if (!current) throw new Error("Learning item not found.");
  const nextStatus = decisionToStatus(input.decision);
  if (!canTransitionLearningStatus(current.status, nextStatus)) {
    throw new Error(`Invalid transition: ${current.status} -> ${nextStatus}`);
  }
  const updated = await transitionLearningItem({
    tenantId: input.tenantId,
    itemId: input.itemId,
    nextStatus,
    actorUserId: input.actorUserId,
    rationale: input.rationale ?? null,
    decision: input.decision,
  });
  if (!updated) throw new Error("Learning item not found.");

  await writeLearningLedger(
    {
      action: "review",
      decision: input.decision,
      tenantId: input.tenantId,
      itemId: updated.id,
      beforeStatus: current.status,
      afterStatus: updated.status,
      actorUserId: input.actorUserId,
      rationale: input.rationale ?? null,
      timestamp: new Date().toISOString(),
    },
    input.decision
  );

  return { id: updated.id, status: updated.status };
}

export async function publishApprovedLearningItem(input: {
  tenantId: string;
  itemId: string;
  actorUserId: string | null;
  libraryId: string;
}): Promise<{ id: string; status: LearningItemStatus; filePath: string; topics: string[] }> {
  const item = await getLearningItemById(input.tenantId, input.itemId);
  if (!item) throw new Error("Learning item not found.");
  if (!(item.status === "approved" || item.status === "published")) {
    throw new Error("Publish requires approved item.");
  }

  const topics = await listTopicsForItem(input.tenantId, input.itemId);
  const topicKey = topics[0] ?? "general";
  const slug = slugifyTitle(item.title);
  const published = publishLearningMarkdown({
    libraryId: input.libraryId,
    topicKey,
    slug,
    itemId: item.id,
    title: item.title,
    sanitizedContent: item.sanitized_content,
    contentSha256: item.content_sha256,
    status: "published",
    sourceKind: item.source_kind,
    sourceRef: item.source_ref,
    provenance: item.provenance_json || {},
    topics,
  });

  const updated = await transitionLearningItem({
    tenantId: input.tenantId,
    itemId: input.itemId,
    nextStatus: "published",
    actorUserId: input.actorUserId,
    rationale: "Published to governed library",
    decision: "publish",
  });
  if (!updated) throw new Error("Learning item not found.");

  await upsertLearningLibraryPath({
    tenantId: input.tenantId,
    itemId: input.itemId,
    libraryId: input.libraryId,
    filePath: published.relativePath,
    contentSha256: item.content_sha256,
  });

  refreshLibraryIndexes();

  await writeLearningLedger(
    {
      action: "publish",
      tenantId: input.tenantId,
      itemId: input.itemId,
      beforeStatus: item.status,
      afterStatus: "published",
      filePath: published.relativePath,
      topics,
      actorUserId: input.actorUserId,
      timestamp: new Date().toISOString(),
    },
    "publish"
  );

  return { id: updated.id, status: updated.status, filePath: published.relativePath, topics };
}

export async function ingestRssSource(input: {
  tenantId: string;
  sourceId: string;
  actorUserId: string | null;
}): Promise<{
  sourceId: string;
  fetchedCount: number;
  proposedCount: number;
}> {
  const source = await getLearningSourceById(input.tenantId, input.sourceId);
  if (!source) throw new Error("Source not found.");
  if (!source.enabled) return { sourceId: source.id, fetchedCount: 0, proposedCount: 0 };
  if (source.kind !== "rss") throw new Error("Source must be rss.");
  if (!source.source_url) throw new Error("RSS source_url is required.");

  const run = await startLearningIngestRun({ tenantId: input.tenantId, sourceId: source.id });
  let fetchedCount = 0;
  let proposedCount = 0;
  let status: "success" | "failed" | "partial" = "success";
  let errorText: string | null = null;

  try {
    const response = await fetch(source.source_url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }
    const xml = await response.text();
    const entries = parseRssEntries(xml, 25);
    fetchedCount = entries.length;
    for (const entry of entries) {
      const proposed = await proposeLearningItem({
        tenantId: input.tenantId,
        sourceId: source.id,
        sourceKind: "rss",
        sourceRef: entry.link,
        title: entry.title,
        rawContent: entry.summary || entry.title,
        proposedByUserId: input.actorUserId,
        provenance: {
          sourceName: source.name,
          sourceUrl: source.source_url,
          link: entry.link,
          publishedAt: entry.publishedAt,
          fetchedAt: new Date().toISOString(),
        },
      });
      if (!proposed.deduped) proposedCount += 1;
    }
  } catch (error) {
    status = fetchedCount > 0 ? "partial" : "failed";
    errorText = error instanceof Error ? error.message : "RSS ingest failed.";
  } finally {
    await finishLearningIngestRun({
      runId: run.id,
      tenantId: input.tenantId,
      status,
      fetchedCount,
      proposedCount,
      errorText,
    });
    await updateLearningSource({
      tenantId: input.tenantId,
      sourceId: source.id,
      patch: {
        last_run_at: new Date().toISOString(),
        last_error: errorText,
      },
    });
  }

  await writeLearningLedger(
    {
      action: "rss_ingest",
      tenantId: input.tenantId,
      sourceId: source.id,
      fetchedCount,
      proposedCount,
      status,
      errorText,
      timestamp: new Date().toISOString(),
    },
    "propose"
  );

  if (status === "failed") throw new Error(errorText ?? "RSS ingest failed.");
  return { sourceId: source.id, fetchedCount, proposedCount };
}

export async function proposeFromChatIfAllowed(input: {
  tenantId: string;
  userId: string | null;
  title: string;
  rawContent: string;
  sourceRef: string | null;
}): Promise<{ accepted: boolean; itemId: string | null; reason: string | null }> {
  const settings = await ensureLearningSettings(input.tenantId);
  if (settings.chat_learning_opt_out) {
    return { accepted: false, itemId: null, reason: "tenant_opt_out" };
  }
  if (!settings.allow_user_chat_proposals && input.userId) {
    return { accepted: false, itemId: null, reason: "user_proposals_disabled" };
  }

  const proposed = await proposeLearningItem({
    tenantId: input.tenantId,
    sourceId: null,
    sourceKind: "chat",
    sourceRef: input.sourceRef,
    title: input.title,
    rawContent: input.rawContent,
    proposedByUserId: input.userId,
    provenance: {
      source: "chat",
      sourceRef: input.sourceRef,
      capturedAt: new Date().toISOString(),
    },
  });
  return { accepted: true, itemId: proposed.itemId, reason: proposed.deduped ? "deduped" : null };
}

export async function listLearningInbox(tenantId: string): Promise<LearningItemStatus[]> {
  const rows = await listLearningItems({ tenantId, limit: 300 });
  return rows.map((x) => x.status);
}

export { listLearningItems, listPublishedLearningItems };
