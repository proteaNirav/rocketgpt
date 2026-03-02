export type CatCatalogItem = {
  cat_id: string;
  canonical_name: string;
  name: string;
  purpose: string;
  version: string;
  status: "proposed" | "draft" | "approved" | "blocked" | "deprecated";
  owner: "user" | "org" | "community";
  requires_approval: boolean;
  passport_required: boolean;
  allowed_side_effects: Array<"none" | "read_only" | "ledger_write" | "workflow_dispatch">;
  tags: string[];
  last_updated: string;
};

type Blueprint = {
  category: string;
  items: Array<{ slug: string; name: string; purpose: string }>;
};

const BLUEPRINTS: Blueprint[] = [
  {
    category: "governance",
    items: [
      { slug: "policy-gate", name: "Policy Gate", purpose: "Validate policy checks before any operational CAT executes." },
      { slug: "change-council", name: "Change Council", purpose: "Coordinate approvals for high-risk platform changes." },
      { slug: "tenant-charter", name: "Tenant Charter", purpose: "Apply tenant-specific governance constraints and defaults." },
      { slug: "approval-matrix", name: "Approval Matrix", purpose: "Resolve required approvers by risk, owner, and side effect." },
      { slug: "release-freeze", name: "Release Freeze Guard", purpose: "Enforce freeze windows during incidents and quarter close." },
    ],
  },
  {
    category: "security",
    items: [
      { slug: "secret-scan", name: "Secret Scanner", purpose: "Detect leaked credentials in code, logs, and generated artifacts." },
      { slug: "rbac-diff", name: "RBAC Drift Diff", purpose: "Compare effective permissions to expected least-privilege policy." },
      { slug: "artifact-signature", name: "Artifact Signature Verifier", purpose: "Verify signatures on release artifacts before promotion." },
      { slug: "session-hardening", name: "Session Hardening Advisor", purpose: "Evaluate session controls and token lifetime recommendations." },
      { slug: "network-boundary", name: "Network Boundary Auditor", purpose: "Validate inbound and outbound boundary policy controls." },
    ],
  },
  {
    category: "replay",
    items: [
      { slug: "timeline-replayer", name: "Timeline Replayer", purpose: "Replay decision timelines for post-incident review and demos." },
      { slug: "denial-simulator", name: "Denial Simulator", purpose: "Simulate denied paths for governance and approval scenarios." },
      { slug: "evidence-locator", name: "Evidence Locator", purpose: "Locate latest evidence bundles tied to CAT replay sessions." },
      { slug: "delta-compare", name: "Replay Delta Comparator", purpose: "Compare two replay runs and summarize behavioral drift." },
      { slug: "determinism-check", name: "Determinism Checker", purpose: "Flag non-deterministic replay output across equivalent inputs." },
    ],
  },
  {
    category: "drift",
    items: [
      { slug: "schema-drift-watch", name: "Schema Drift Watch", purpose: "Detect changes in upstream schemas before they break flows." },
      { slug: "prompt-drift", name: "Prompt Drift Monitor", purpose: "Track prompt-level drift against approved baseline prompts." },
      { slug: "model-drift", name: "Model Drift Sentinel", purpose: "Detect model response changes after provider updates." },
      { slug: "config-drift", name: "Config Drift Inspector", purpose: "Compare deployed config with version-controlled policy sets." },
      { slug: "runtime-drift", name: "Runtime Drift Tracker", purpose: "Observe environment drift between staging and production runtime." },
    ],
  },
  {
    category: "ci",
    items: [
      { slug: "pipeline-health", name: "Pipeline Health Gate", purpose: "Aggregate CI outcomes and block rollout when quality regresses." },
      { slug: "test-flake-hunter", name: "Test Flake Hunter", purpose: "Identify flaky tests and rank by failure volatility." },
      { slug: "coverage-auditor", name: "Coverage Auditor", purpose: "Enforce coverage thresholds per domain and risk profile." },
      { slug: "artifact-promoter", name: "Artifact Promoter", purpose: "Promote signed build artifacts across controlled environments." },
      { slug: "release-notes-bot", name: "Release Notes Bot", purpose: "Generate structured release notes from merged change sets." },
    ],
  },
  {
    category: "ops",
    items: [
      { slug: "incident-triage", name: "Incident Triage", purpose: "Classify incoming incidents and suggest first responder playbooks." },
      { slug: "runbook-checker", name: "Runbook Checker", purpose: "Validate runbook completeness against current service topology." },
      { slug: "cost-anomaly", name: "Cost Anomaly Detector", purpose: "Detect unusual infrastructure spend and trigger investigation." },
      { slug: "maintenance-window", name: "Maintenance Window Planner", purpose: "Recommend low-impact windows for planned maintenance." },
      { slug: "oncall-rotator", name: "On-call Rotator", purpose: "Generate compliant rotations while minimizing burnout risk." },
    ],
  },
  {
    category: "data",
    items: [
      { slug: "quality-scorecard", name: "Data Quality Scorecard", purpose: "Compute quality scorecards across critical data domains." },
      { slug: "lineage-mapper", name: "Lineage Mapper", purpose: "Build lineage maps for audited reporting tables and transforms." },
      { slug: "pii-redactor", name: "PII Redactor", purpose: "Mask regulated fields before downstream analytics processing." },
      { slug: "freshness-monitor", name: "Freshness Monitor", purpose: "Track staleness for latency-sensitive business datasets." },
      { slug: "contract-validator", name: "Data Contract Validator", purpose: "Enforce producer/consumer contracts across integration feeds." },
    ],
  },
  {
    category: "hrms",
    items: [
      { slug: "new-hire-orchestrator", name: "New Hire Orchestrator", purpose: "Coordinate onboarding tasks across HRMS and IT systems." },
      { slug: "leave-balance-audit", name: "Leave Balance Audit", purpose: "Verify leave accrual and entitlement policy alignment." },
      { slug: "performance-cycle", name: "Performance Cycle Assistant", purpose: "Track performance review milestones and reminders." },
      { slug: "training-compliance", name: "Training Compliance Tracker", purpose: "Flag overdue mandatory training assignments by team." },
      { slug: "offboarding-checklist", name: "Offboarding Checklist", purpose: "Enforce secure offboarding and access revocation controls." },
    ],
  },
  {
    category: "vms",
    items: [
      { slug: "vendor-onboarding", name: "Vendor Onboarding", purpose: "Standardize vendor onboarding with risk and legal checks." },
      { slug: "invoice-reconciliation", name: "Invoice Reconciliation", purpose: "Match vendor invoices against approved statements of work." },
      { slug: "sla-monitor", name: "SLA Monitor", purpose: "Track vendor SLA breaches and escalation triggers." },
      { slug: "contract-renewal", name: "Contract Renewal Planner", purpose: "Plan renewals with spend trends and risk recommendations." },
      { slug: "risk-rating", name: "Vendor Risk Rating", purpose: "Calculate and update composite risk score for key vendors." },
    ],
  },
  {
    category: "sales-automation",
    items: [
      { slug: "lead-router", name: "Lead Router", purpose: "Assign inbound leads based on territory and account fit." },
      { slug: "opportunity-scorer", name: "Opportunity Scorer", purpose: "Score opportunities for forecast confidence and prioritization." },
      { slug: "cadence-optimizer", name: "Cadence Optimizer", purpose: "Tune outreach cadence based on response performance." },
      { slug: "quote-qa", name: "Quote QA", purpose: "Validate generated quotes against pricing and discount policy." },
      { slug: "renewal-predictor", name: "Renewal Predictor", purpose: "Identify renewal risks and suggest retention interventions." },
    ],
  },
  {
    category: "reporting",
    items: [
      { slug: "exec-brief", name: "Executive Brief Generator", purpose: "Produce concise weekly executive business briefings." },
      { slug: "kpi-rollup", name: "KPI Rollup", purpose: "Aggregate team KPIs into cross-functional program dashboards." },
      { slug: "board-pack", name: "Board Pack Builder", purpose: "Assemble board report materials from governed source metrics." },
      { slug: "variance-explainer", name: "Variance Explainer", purpose: "Explain metric variance against plan and prior period." },
      { slug: "audit-snapshot", name: "Audit Snapshot", purpose: "Capture auditable metric snapshots for compliance evidence." },
    ],
  },
  {
    category: "integrations",
    items: [
      { slug: "crm-sync", name: "CRM Sync Coordinator", purpose: "Coordinate bi-directional sync and conflict resolution policies." },
      { slug: "erp-bridge", name: "ERP Bridge", purpose: "Normalize ERP transactions for downstream system consumption." },
      { slug: "ticketing-sync", name: "Ticketing Sync", purpose: "Mirror ticket lifecycle updates across support platforms." },
      { slug: "message-bus-gateway", name: "Message Bus Gateway", purpose: "Route governed integration events to approved consumers." },
      { slug: "webhook-validator", name: "Webhook Validator", purpose: "Validate webhook payload signatures and schema conformance." },
    ],
  },
  {
    category: "analytics",
    items: [
      { slug: "funnel-analyzer", name: "Funnel Analyzer", purpose: "Measure conversion friction across product lifecycle stages." },
      { slug: "retention-cohort", name: "Retention Cohort Tracker", purpose: "Track retention cohorts and long-term behavior segments." },
      { slug: "abtest-interpreter", name: "A/B Test Interpreter", purpose: "Summarize experiment results with confidence indicators." },
      { slug: "segment-builder", name: "Segment Builder", purpose: "Create reusable behavioral segments for analytics activation." },
      { slug: "forecast-studio", name: "Forecast Studio", purpose: "Produce scenario forecasts with confidence bounds." },
    ],
  },
  {
    category: "agents",
    items: [
      { slug: "planner-agent", name: "Planner Agent", purpose: "Create structured plans from high-level objectives." },
      { slug: "review-agent", name: "Review Agent", purpose: "Run policy checks over generated plans and outputs." },
      { slug: "qa-agent", name: "QA Agent", purpose: "Execute deterministic test suites over agent outcomes." },
      { slug: "handoff-agent", name: "Handoff Agent", purpose: "Package context for seamless cross-agent handoffs." },
      { slug: "supervisor-agent", name: "Supervisor Agent", purpose: "Coordinate multi-agent execution with safety constraints." },
    ],
  },
  {
    category: "compliance",
    items: [
      { slug: "control-mapper", name: "Control Mapper", purpose: "Map operational controls to framework requirements." },
      { slug: "evidence-packager", name: "Evidence Packager", purpose: "Assemble evidence bundles for control attestation." },
      { slug: "policy-attestor", name: "Policy Attestor", purpose: "Confirm policy versions and attest enforcement status." },
      { slug: "exception-register", name: "Exception Register", purpose: "Track compliance exceptions and remediation SLAs." },
      { slug: "audit-trail-verifier", name: "Audit Trail Verifier", purpose: "Validate completeness of immutable audit trails." },
    ],
  },
  {
    category: "finance",
    items: [
      { slug: "close-checklist", name: "Close Checklist", purpose: "Run finance close checklist with owner sign-off tracking." },
      { slug: "revenue-recognition", name: "Revenue Recognition Guard", purpose: "Validate recognition events against accounting policy." },
      { slug: "expense-policy", name: "Expense Policy Enforcer", purpose: "Detect expense violations and route for approval." },
      { slug: "cashflow-monitor", name: "Cashflow Monitor", purpose: "Monitor short-term cashflow health and liquidity signals." },
      { slug: "budget-reallocator", name: "Budget Reallocator", purpose: "Recommend budget reallocations across strategic programs." },
    ],
  },
  {
    category: "support",
    items: [
      { slug: "ticket-priority", name: "Ticket Priority Router", purpose: "Classify and prioritize support cases by impact." },
      { slug: "sla-recovery", name: "SLA Recovery Coach", purpose: "Suggest intervention plans for at-risk SLA queues." },
      { slug: "kb-curator", name: "Knowledge Base Curator", purpose: "Recommend missing KB articles from case patterns." },
      { slug: "escalation-guard", name: "Escalation Guard", purpose: "Enforce escalation policy and ownership transitions." },
      { slug: "csat-insights", name: "CSAT Insights", purpose: "Surface recurring drivers behind satisfaction changes." },
    ],
  },
  {
    category: "procurement",
    items: [
      { slug: "intake-normalizer", name: "Intake Normalizer", purpose: "Standardize procurement requests for downstream workflows." },
      { slug: "bid-comparator", name: "Bid Comparator", purpose: "Compare bids with weighted scoring and governance checks." },
      { slug: "po-validator", name: "PO Validator", purpose: "Validate purchase order compliance before approval." },
      { slug: "approval-chain", name: "Approval Chain Resolver", purpose: "Compute required approver chain for each spend tier." },
      { slug: "supplier-diversity", name: "Supplier Diversity Tracker", purpose: "Measure diversity targets across awarded contracts." },
    ],
  },
  {
    category: "risk",
    items: [
      { slug: "risk-register-sync", name: "Risk Register Sync", purpose: "Synchronize risks from operations into enterprise register." },
      { slug: "control-gap", name: "Control Gap Finder", purpose: "Identify uncovered controls across high-risk domains." },
      { slug: "scenario-stress", name: "Scenario Stress Tester", purpose: "Stress test operations against plausible disruption scenarios." },
      { slug: "thirdparty-watch", name: "Third-party Watch", purpose: "Monitor third-party events that impact operational risk." },
      { slug: "exception-heatmap", name: "Exception Heatmap", purpose: "Visualize exception concentration by process and team." },
    ],
  },
  {
    category: "platform",
    items: [
      { slug: "runtime-profile", name: "Runtime Profile", purpose: "Profile runtime characteristics for latency-sensitive services." },
      { slug: "capacity-planner", name: "Capacity Planner", purpose: "Forecast infrastructure capacity against growth scenarios." },
      { slug: "feature-flag-audit", name: "Feature Flag Audit", purpose: "Audit stale and risky feature flags in production." },
      { slug: "dependency-graph", name: "Dependency Graph Curator", purpose: "Curate service dependency graph for blast-radius analysis." },
      { slug: "upgrade-orchestrator", name: "Upgrade Orchestrator", purpose: "Coordinate safe dependency and runtime upgrades." },
    ],
  },
];

const STATUS_CYCLE: CatCatalogItem["status"][] = [
  "proposed",
  "draft",
  "approved",
  "blocked",
  "deprecated",
];

const OWNER_CYCLE: CatCatalogItem["owner"][] = ["user", "org", "community"];

const VERSION_CYCLE = ["0.1.0", "0.2.0", "0.3.0", "1.0.0", "1.1.0"];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function deriveEffects(category: string, slug: string, index: number): CatCatalogItem["allowed_side_effects"] {
  if (slug.includes("dispatch") || slug.includes("gateway") || slug.includes("orchestrator")) {
    return ["read_only", "workflow_dispatch"];
  }
  if (["governance", "compliance", "risk", "procurement", "finance"].includes(category)) {
    return ["read_only", "ledger_write"];
  }
  if (["security", "replay", "drift", "analytics", "reporting"].includes(category)) {
    return ["read_only"];
  }
  if (index % 7 === 0) {
    return ["none"];
  }
  return ["read_only", "ledger_write"];
}

function deriveRequiresApproval(category: string, effects: CatCatalogItem["allowed_side_effects"]): boolean {
  if (effects.includes("workflow_dispatch") || effects.includes("ledger_write")) return true;
  return ["governance", "security", "compliance", "risk", "finance", "procurement"].includes(category);
}

function derivePassportRequired(category: string, index: number): boolean {
  if (["security", "compliance", "risk", "finance", "hrms", "vms"].includes(category)) return true;
  return index % 3 === 0;
}

function buildDate(index: number): string {
  const year = 2026;
  const month = String((index % 12) + 1).padStart(2, "0");
  const day = String(((index * 3) % 28) + 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const generated = BLUEPRINTS.flatMap((blueprint) =>
  blueprint.items.map((item) => ({
    category: blueprint.category,
    ...item,
  }))
);

export const SEED_CATS: CatCatalogItem[] = generated.map((item, index) => {
  const ordinal = index + 1;
  const effects = deriveEffects(item.category, item.slug, ordinal);
  const tags = unique([
    item.category,
    ...item.slug.split("-"),
    effects.includes("workflow_dispatch") ? "dispatch" : "non-dispatch",
    effects.includes("ledger_write") ? "stateful" : "stateless",
  ]);

  return {
    cat_id: `RGPT-CAT-${String(ordinal).padStart(3, "0")}`,
    canonical_name: `cats/${item.category}/${item.slug}`,
    name: item.name,
    purpose: item.purpose,
    version: VERSION_CYCLE[index % VERSION_CYCLE.length],
    status: STATUS_CYCLE[index % STATUS_CYCLE.length],
    owner: OWNER_CYCLE[index % OWNER_CYCLE.length],
    requires_approval: deriveRequiresApproval(item.category, effects),
    passport_required: derivePassportRequired(item.category, ordinal),
    allowed_side_effects: effects,
    tags,
    last_updated: buildDate(ordinal),
  };
});

if (SEED_CATS.length !== 100) {
  throw new Error(`Expected 100 seed CATS, got ${SEED_CATS.length}`);
}

