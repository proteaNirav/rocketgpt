import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "intelligence-promotions.json");
}

function readPromotions() {
  try {
    const payload = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return Array.isArray(payload?.proposals) ? payload.proposals : [];
  } catch {
    return [];
  }
}

function writePromotions(proposals) {
  const fp = storePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify({ proposals }, null, 2), "utf8");
}

function sha(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function buildOverrideDiffPreview(overrides) {
  const safe = overrides || {};
  const scoring = safe.scoringWeights || null;
  return {
    add_avoid_cat_ids: Array.isArray(safe.avoidCatIds) ? safe.avoidCatIds : [],
    set_max_nodes: Number.isInteger(safe.maxNodes) ? safe.maxNodes : null,
    set_scoring_weights: scoring
      ? {
          question: Number(scoring.question ?? 0),
          cat: Number(scoring.cat ?? 0),
          workflow: Number(scoring.workflow ?? 0),
          platform: Number(scoring.platform ?? 0),
        }
      : null,
    force_fast_until_ms: Number.isFinite(safe.forceFastUntilMs) ? Number(safe.forceFastUntilMs) : null,
  };
}

export function createPromotionProposal(input) {
  const now = new Date().toISOString();
  const versionHash = sha(`${input.tenantId}|${input.chatId}|${now}|${JSON.stringify(input.diffPreview)}`).slice(0, 10);
  const proposalId = `INTEL-PROMOTE-${versionHash}`;
  const proposal = {
    proposalId,
    proposalVersion: 1,
    createdAt: now,
    createdBy: input.createdBy || "unknown",
    tenantId: input.tenantId,
    chatId: input.chatId,
    reason: input.reason || "Promote chat-isolated intelligence overrides to global proposal.",
    diffPreview: input.diffPreview,
    governance: {
      approvalRequired: true,
      status: "pending",
    },
  };

  const proposals = readPromotions();
  proposals.unshift(proposal);
  writePromotions(proposals.slice(0, 500));
  return proposal;
}

export function listPromotionProposals() {
  return readPromotions();
}
