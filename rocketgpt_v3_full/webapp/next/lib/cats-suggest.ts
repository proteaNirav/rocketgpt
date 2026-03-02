import { makeDevPendingCat, upsertDynamicCat } from '@/lib/cats-dynamic';
import { CatCatalogItem } from "@/lib/cats-seed";

export type CatSuggestion = {
  item: CatCatalogItem;
  score: number;
  reason: string;
};

const KEYWORD_BOOSTS: Record<string, string[]> = {
  governance: ["policy", "approval", "compliance", "audit", "risk", "control", "governance"],
  security: ["security", "rbac", "auth", "credential", "secret", "threat"],
  replay: ["replay", "timeline", "incident", "forensic", "evidence"],
  drift: ["drift", "baseline", "regression", "schema", "change"],
  ci: ["ci", "build", "pipeline", "test", "release"],
  ops: ["ops", "incident", "oncall", "runbook", "maintenance"],
  data: ["data", "quality", "lineage", "contract", "freshness"],
  hrms: ["hr", "hire", "onboarding", "offboarding", "training"],
  vms: ["vendor", "vms", "supplier", "sla", "contract"],
  "sales-automation": ["sales", "lead", "opportunity", "quote", "renewal"],
  reporting: ["report", "kpi", "dashboard", "variance", "board"],
  integrations: ["integration", "sync", "webhook", "gateway", "erp", "crm"],
  analytics: ["analytics", "cohort", "funnel", "forecast", "segment"],
  agents: ["agent", "planner", "review", "qa", "handoff"],
  workflow: ["workflow", "orchestration", "automation", "scheduler", "schedule"],
};

const EXTRA_KEYWORD_ALIASES: Record<string, string[]> = {
  zoho: ["crm", "integration", "email"],
  inbox: ["email"],
  cleanup: ["retention", "automation"],
  trash: ["retention", "cleanup"],
  delete: ["cleanup", "retention"],
  scheduler: ["schedule", "automation"],
};

const PHRASE_HINTS: Array<{ phrase: string; categories: string[]; reason: string }> = [
  {
    phrase: "every 15 days",
    categories: ["ops", "workflow", "integrations", "reporting"],
    reason: "recurring interval cadence",
  },
  {
    phrase: "clear trash",
    categories: ["ops", "integrations", "workflow"],
    reason: "mailbox cleanup operation",
  },
  {
    phrase: "zoho email",
    categories: ["integrations", "ops", "workflow"],
    reason: "third-party email integration workflow",
  },
];

const CATEGORY_INTENT_BOOSTS: Record<string, string[]> = {
  integrations: ["zoho", "email", "inbox", "sync", "integration", "automation", "scheduler", "schedule"],
  ops: ["delete", "cleanup", "trash", "retention", "maintenance", "runbook"],
  workflow: ["workflow", "automation", "orchestration", "schedule", "approval", "audit"],
  reporting: ["audit", "reporting", "report"],
  governance: ["approval", "audit", "policy", "compliance"],
};

function tokenize(input: string): string[] {
  const tokens = input
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const aliases = EXTRA_KEYWORD_ALIASES[token];
    if (!aliases) continue;
    for (const alias of aliases) expanded.add(alias);
  }
  return Array.from(expanded);
}

function includesWholeWord(text: string, token: string): boolean {
  return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

export function suggestCats(conversationText: string, seedCats: CatCatalogItem[]): CatSuggestion[] {
  const normalizedConversation = conversationText.toLowerCase();
  const tokens = tokenize(normalizedConversation);
  const tokenSet = new Set(tokens);

  const scored = seedCats.map((item) => {
    const reasons: string[] = [];
    let score = 0;

    const fullText = `${item.name} ${item.canonical_name} ${item.purpose}`.toLowerCase();
    const tagSet = new Set(item.tags.map((tag) => tag.toLowerCase()));

    for (const token of tokenSet) {
      if (tagSet.has(token)) {
        score += 8;
        reasons.push(`tag '${token}' matched`);
        continue;
      }

      if (includesWholeWord(item.canonical_name.toLowerCase(), token)) {
        score += 6;
        reasons.push(`canonical keyword '${token}' matched`);
        continue;
      }

      if (includesWholeWord(fullText, token)) {
        score += 4;
        reasons.push(`purpose keyword '${token}' matched`);
      }
    }

    const category = item.canonical_name.split("/")[1] || "";
    const boosts = KEYWORD_BOOSTS[category] || [];
    const boostHits = boosts.filter((word) => tokenSet.has(word));
    if (boostHits.length > 0) {
      score += boostHits.length * 3;
      reasons.push(`category '${category}' aligned (${boostHits.join(", ")})`);
    }

    const intentBoosts = CATEGORY_INTENT_BOOSTS[category] || [];
    const intentHits = intentBoosts.filter((word) => tokenSet.has(word));
    if (intentHits.length > 0) {
      score += intentHits.length * 4;
      reasons.push(`intent fit for '${category}' (${intentHits.slice(0, 3).join(", ")})`);
    }

    for (const hint of PHRASE_HINTS) {
      if (normalizedConversation.includes(hint.phrase) && hint.categories.includes(category)) {
        score += 7;
        reasons.push(`${hint.reason} (${hint.phrase})`);
      }
    }

    if (tokenSet.has("approval") && item.requires_approval) {
      score += 2;
      reasons.push("requires approval as requested");
    }

    if (tokenSet.has("passport") && item.passport_required) {
      score += 2;
      reasons.push("passport enforcement matched");
    }

    if (tokenSet.has("workflow") && item.allowed_side_effects.includes("workflow_dispatch")) {
      score += 2;
      reasons.push("supports workflow dispatch");
    }

    if (tokenSet.has("automation") && item.allowed_side_effects.includes("workflow_dispatch")) {
      score += 3;
      reasons.push("automation request prefers dispatch-capable CAT");
    }

    const reason = reasons.length > 0 ? reasons.slice(0, 3).join("; ") : "broad seed catalog fit";
    return { item, score, reason };
  });

  const sorted = scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.cat_id.localeCompare(b.item.cat_id);
  });

  const withSignal = sorted.filter((entry) => entry.score > 0);
  const picked = withSignal.length >= 3 ? withSignal.slice(0, 5) : sorted.slice(0, 5);
  return picked.slice(0, Math.max(3, Math.min(5, picked.length)));
}


function createPendingCatsFromText(conversationText: string) {
  const t = conversationText.toLowerCase();

  // Very simple intent detection for demo (expand later)
  const isEmail = /zoho|mail|email|inbox|trash|recycle/.test(t);
  const isRetention = /15\s*days|retention|purge|delete folder|trash/.test(t);
  const isAutomation = /every|schedule|cron|daily|weekly/.test(t);

  const cats: any[] = [];
  if (isEmail) {
    cats.push(makeDevPendingCat({ name: "Zoho Mail Connector", purpose: "Connect to Zoho Mail, list/search messages (development pending).", tags: ["zoho","email","auth"], allowed_side_effects: ["read_only"] }));
    cats.push(makeDevPendingCat({ name: "Email Classifier", purpose: "Classify unnecessary emails using rules/heuristics (development pending).", tags: ["email","classifier","cleanup"], allowed_side_effects: ["read_only","ledger_write"] }));
    cats.push(makeDevPendingCat({ name: "Bulk Delete Executor", purpose: "Delete selected emails (moves to trash) with audit logs (development pending).", tags: ["email","delete","batch"], allowed_side_effects: ["workflow_dispatch","ledger_write"] }));
  }
  if (isEmail && isRetention) {
    cats.push(makeDevPendingCat({ name: "Trash Purger", purpose: "Permanently purge trash/recycle bin on retention schedule (development pending).", tags: ["email","trash","retention"], allowed_side_effects: ["workflow_dispatch","ledger_write"] }));
  }
  if (isAutomation || isRetention) {
    cats.push(makeDevPendingCat({ name: "Retention Scheduler", purpose: "Schedule automated runs and produce evidence artifacts (development pending).", tags: ["scheduler","ops","audit"], allowed_side_effects: ["ledger_write"] }));
  }

  // keep 3–5
  return cats.slice(0, 5);
}
