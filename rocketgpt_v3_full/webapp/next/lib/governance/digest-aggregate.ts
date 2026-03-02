import crypto from "crypto";

import type { WeeklyDigestSnapshot } from "./types";

function digestId(weekStart: string, weekEnd: string): string {
  return crypto.createHash("sha256").update(`${weekStart}|${weekEnd}`).digest("hex");
}

export function aggregateWeeklyDigest(
  crpsExecutions: any[],
  containmentEvents: any[],
  weekStart: string,
  weekEnd: string
): WeeklyDigestSnapshot {
  const countMap = new Map<string, { count: number; workflowId: string; riskDomains: string[] }>();
  for (const row of crpsExecutions) {
    const current = countMap.get(row.crps_id);
    if (!current) {
      countMap.set(row.crps_id, {
        count: 1,
        workflowId: row.workflow_id,
        riskDomains: row.risk_domains ?? [],
      });
    } else {
      current.count += 1;
    }
  }

  const topPatterns = Array.from(countMap.entries())
    .map(([crpsId, value]) => ({
      crpsId,
      count: value.count,
      trend: (value.count === 1 ? "new" : value.count >= 5 ? "up" : "flat") as "new" | "up" | "flat",
      riskDomains: value.riskDomains as any,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const l2l3Events = containmentEvents
    .filter((event) => Number(event.containment_level) >= 2)
    .slice(0, 50)
    .map((event) => ({
      containmentEventId: event.id,
      level: Number(event.containment_level) as 2 | 3,
      workflowId: event.workflow_id,
      crpsId: event.crps_id,
      occurredAt: event.created_at,
      explanation: event.explanation,
    }));

  const newPatterns = topPatterns.filter((pattern) => pattern.trend === "new").map((pattern) => pattern.crpsId);
  const policyAdjustmentProposals: string[] = [];
  const legalSecurityHits = topPatterns.filter((pattern) =>
    pattern.riskDomains.some((domain) => domain === "legal" || domain === "security")
  ).length;
  if (legalSecurityHits >= 3) {
    policyAdjustmentProposals.push(
      "Increase approval requirements for legal/security patterns that appeared 3+ times this week."
    );
  }
  if (l2l3Events.length >= 5) {
    policyAdjustmentProposals.push(
      "Review L2/L3 thresholds: high intervention volume suggests tuning impact/reversibility cutoffs."
    );
  }
  if (policyAdjustmentProposals.length === 0) {
    policyAdjustmentProposals.push("No urgent threshold changes recommended this week.");
  }

  return {
    id: digestId(weekStart, weekEnd),
    weekStart,
    weekEnd,
    topPatterns,
    l2l3Events,
    newPatterns,
    policyAdjustmentProposals,
    generatedAt: new Date().toISOString(),
  };
}

