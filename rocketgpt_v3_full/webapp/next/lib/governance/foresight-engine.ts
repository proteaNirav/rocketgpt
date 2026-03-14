import type { ContainmentDecision, CrpsSignature, ForesightTask, RiskDomain } from './types'

function domainQueues(domains: RiskDomain[]): RiskDomain[] {
  if (domains.length === 0) return ['security']
  return Array.from(new Set(domains))
}

export function buildForesightTask(
  crps: CrpsSignature,
  containment: ContainmentDecision,
): Omit<ForesightTask, 'id' | 'createdAt'> {
  const domains = domainQueues(crps.riskDomains)
  return {
    crpsId: crps.crpsId,
    summary: `Containment L${containment.level} triggered for workflow ${crps.workflowId}.`,
    whyItMatters:
      `Impact score ${crps.impactScore}, reversibility ${crps.reversibilityScore}, and domains ` +
      `${domains.join(', ')} indicate elevated governance risk.`,
    scenarios: {
      best: 'Containment controls hold, workflow is revised, and risk drops in next run.',
      likely: 'Workflow pauses for approval/simulation updates before controlled restart.',
      worst:
        'Unauthorized bypass causes high-impact irreversible outcomes requiring incident response.',
    },
    stopConditions: [
      'Unexpected side effects outside approved domains.',
      'Manual override rate exceeds policy threshold.',
      'Simulation report missing or stale.',
    ],
    mitigationIfLate:
      'Force emergency brake, snapshot execution context, and route to manual incident review.',
    recommendedPolicyChanges: [
      'Tighten thresholds for high-frequency CRPS patterns.',
      'Increase approval requirements for multi-domain workflows.',
    ],
    recommendedCatPatches: [
      'Add reversible mode toggles to high-impact CATs.',
      'Restrict workflow_dispatch scopes with explicit allow-lists.',
    ],
    domainQueues: domains,
    status: 'open',
  }
}
