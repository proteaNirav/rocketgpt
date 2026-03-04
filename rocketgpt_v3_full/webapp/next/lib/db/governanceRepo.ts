import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  ContainmentDecision,
  ContainmentLevel,
  CrpsSignature,
  ForesightTaskStatus,
  GovernanceLedgerEventType,
  GovernancePolicyRule,
  WeeklyDigestSnapshot,
} from "@/lib/governance/types";
import { DEFAULT_GOVERNANCE_RULES } from "@/lib/governance/policy-engine";

const TABLES = {
  crpsExecutions: "governance.crps_executions",
  weeklyPatterns: "governance.crps_weekly_patterns",
  policies: "governance.policy_rules",
  containmentEvents: "governance.containment_events",
  foresightTasks: "governance.foresight_tasks",
  digests: "governance.weekly_digest_snapshots",
  ledger: "governance.ledger_events",
} as const;

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

function toIsoWeekStart(input: string | Date): string {
  const date = new Date(input);
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export async function insertCrpsExecution(
  runId: string,
  actorId: string | null,
  orgId: string | null,
  crps: CrpsSignature
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(TABLES.crpsExecutions).insert({
    run_id: runId,
    org_id: orgId,
    actor_id: actorId,
    crps_id: crps.crpsId,
    workflow_id: crps.workflowId,
    cats_involved: crps.catsInvolved,
    params_fingerprint: crps.paramsFingerprint,
    risk_domains: crps.riskDomains,
    impact_score: crps.impactScore,
    reversibility_score: crps.reversibilityScore,
    aggressiveness_score: crps.aggressivenessScore,
    override_rate: crps.overrideRate,
    confidence: crps.confidence,
    recommended_level: crps.recommendedLevel,
    evidence_refs: crps.evidenceRefs,
  });
  if (error) throw new Error(error.message);
}

export async function listCrpsExecutions(from?: string, to?: string): Promise<any[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(TABLES.crpsExecutions).select("*").order("created_at", { ascending: false }).limit(500);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRecentCrpsCount(crpsId: string, withinDays: number): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from(TABLES.crpsExecutions)
    .select("id", { count: "exact", head: true })
    .eq("crps_id", crpsId)
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function loadPolicyRules(): Promise<GovernancePolicyRule[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.policies)
    .select("*")
    .order("priority", { ascending: false });
  if (error) {
    if (error.message.toLowerCase().includes("relation")) {
      return DEFAULT_GOVERNANCE_RULES;
    }
    throw new Error(error.message);
  }
  if (!data || data.length === 0) return DEFAULT_GOVERNANCE_RULES;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    enabled: !!row.enabled,
    priority: Number(row.priority ?? 0),
    conditions: row.conditions ?? {},
    action: row.action ?? { level: 1, explainTemplate: "Fallback policy." },
  }));
}

export async function upsertPolicyRule(rule: GovernancePolicyRule): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(TABLES.policies).upsert({
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    conditions: rule.conditions,
    action: rule.action,
  });
  if (error) throw new Error(error.message);
}

export async function insertContainmentEvent(input: {
  runId: string;
  workflowId: string;
  crpsId: string;
  level: ContainmentLevel;
  decision: ContainmentDecision;
  policyRuleId: string | null;
  policyRuleName: string | null;
}): Promise<{ id: string }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.containmentEvents)
    .insert({
      run_id: input.runId,
      workflow_id: input.workflowId,
      crps_id: input.crpsId,
      containment_level: input.level,
      decision_payload: input.decision,
      explanation: input.decision.explanation,
      policy_rule_id: input.policyRuleId,
      policy_rule_name: input.policyRuleName,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function listContainmentEvents(from?: string, to?: string): Promise<any[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(TABLES.containmentEvents).select("*").order("created_at", { ascending: false }).limit(500);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertForesightTask(input: {
  crpsId: string;
  summary: string;
  whyItMatters: string;
  scenarios: Record<string, unknown>;
  stopConditions: string[];
  mitigationIfLate: string;
  recommendedPolicyChanges: string[];
  recommendedCatPatches: string[];
  domainQueues: string[];
  status: ForesightTaskStatus;
}): Promise<{ id: string }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.foresightTasks)
    .insert({
      crps_id: input.crpsId,
      summary: input.summary,
      why_it_matters: input.whyItMatters,
      scenarios: input.scenarios,
      stop_conditions: input.stopConditions,
      mitigation_if_late: input.mitigationIfLate,
      recommended_policy_changes: input.recommendedPolicyChanges,
      recommended_cat_patches: input.recommendedCatPatches,
      domain_queues: input.domainQueues,
      status: input.status,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function listForesightTasks(status?: ForesightTaskStatus): Promise<any[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(TABLES.foresightTasks).select("*").order("created_at", { ascending: false }).limit(500);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function insertWeeklyDigest(snapshot: WeeklyDigestSnapshot): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(TABLES.digests).insert({
    id: snapshot.id,
    week_start: snapshot.weekStart,
    week_end: snapshot.weekEnd,
    digest_payload: snapshot,
    generated_at: snapshot.generatedAt,
  });
  if (error) throw new Error(error.message);
}

export async function listWeeklyDigests(): Promise<any[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.digests)
    .select("*")
    .order("generated_at", { ascending: false })
    .limit(52);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertWeeklyPattern(input: {
  weekStart: string;
  crpsId: string;
  workflowId: string;
  riskDomains: string[];
  count: number;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(TABLES.weeklyPatterns).upsert(
    {
      week_start: toIsoWeekStart(input.weekStart),
      crps_id: input.crpsId,
      workflow_id: input.workflowId,
      risk_domains: input.riskDomains,
      execution_count: input.count,
    },
    { onConflict: "week_start,crps_id" }
  );
  if (error) throw new Error(error.message);
}

export async function appendGovernanceLedgerEvent(input: {
  eventType: GovernanceLedgerEventType;
  runId?: string | null;
  workflowId: string;
  crpsId?: string | null;
  payload: Record<string, unknown>;
}): Promise<{ id: string }> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.ledger)
    .insert({
      event_type: input.eventType,
      run_id: input.runId ?? null,
      workflow_id: input.workflowId,
      crps_id: input.crpsId ?? null,
      payload: input.payload,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function getLastDigestGeneratedAt(): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(TABLES.digests)
    .select("generated_at")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.generated_at ?? null;
}

