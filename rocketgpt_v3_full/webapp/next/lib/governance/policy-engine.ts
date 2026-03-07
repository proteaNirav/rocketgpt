import type {
  ContainmentLevel,
  CrpsSignature,
  GovernancePolicyAction,
  GovernancePolicyRule,
  PolicyContext,
  PolicyDecision,
} from './types'

function actionForLevel(level: ContainmentLevel): GovernancePolicyAction {
  if (level === 3) {
    return {
      level: 3,
      explainTemplate: 'Emergency containment activated.',
      lockParameters: ['*'],
      disableAutoExec: true,
      requireApprovalCheckpoint: true,
      requireSimulationReport: true,
      blockExecution: true,
      openIncident: true,
      silent: false,
    }
  }
  if (level === 2) {
    return {
      level: 2,
      explainTemplate: 'Hard containment applied. Approval checkpoint required.',
      lockParameters: ['aggressiveMode', 'autoExecute', 'maxBudget'],
      disableAutoExec: true,
      requireApprovalCheckpoint: true,
      requireSimulationReport: true,
      blockExecution: false,
      openIncident: false,
      silent: false,
    }
  }
  return {
    level: 1,
    explainTemplate: 'Soft containment applied to rebalance execution.',
    disableAutoExec: false,
    requireApprovalCheckpoint: false,
    requireSimulationReport: true,
    blockExecution: false,
    openIncident: false,
    silent: true,
  }
}

function renderTemplate(template: string, crps: CrpsSignature): string {
  return template
    .replaceAll('{impactScore}', String(crps.impactScore))
    .replaceAll('{reversibilityScore}', String(crps.reversibilityScore))
    .replaceAll('{aggressivenessScore}', String(crps.aggressivenessScore))
    .replaceAll('{domains}', crps.riskDomains.join(', ') || 'none')
}

function matchesRule(
  rule: GovernancePolicyRule,
  crps: CrpsSignature,
  context: PolicyContext,
): boolean {
  const c = rule.conditions
  if (c.impactScoreGte !== undefined && crps.impactScore < c.impactScoreGte) return false
  if (c.reversibilityScoreLte !== undefined && crps.reversibilityScore > c.reversibilityScoreLte)
    return false
  if (c.aggressivenessScoreGte !== undefined && crps.aggressivenessScore < c.aggressivenessScoreGte)
    return false
  if (c.overrideRateGte !== undefined && crps.overrideRate < c.overrideRateGte) return false
  if (c.confidenceGte !== undefined && crps.confidence < c.confidenceGte) return false
  if (c.repeatCountGte !== undefined && context.repeatCount < c.repeatCountGte) return false
  if (c.redLineMatch !== undefined && context.redLineMatch !== c.redLineMatch) return false
  if (c.approvalsMissing !== undefined && context.approvalsMissing !== c.approvalsMissing)
    return false
  if (c.simulationMissing !== undefined && context.simulationMissing !== c.simulationMissing)
    return false
  if (c.domainsIncludeAny?.length) {
    if (!c.domainsIncludeAny.some((domain) => crps.riskDomains.includes(domain))) return false
  }
  if (c.domainsIncludeAll?.length) {
    if (!c.domainsIncludeAll.every((domain) => crps.riskDomains.includes(domain))) return false
  }
  return true
}

export function evaluatePolicyRules(
  rules: GovernancePolicyRule[],
  crps: CrpsSignature,
  context: PolicyContext,
): PolicyDecision {
  const sorted = rules
    .filter((rule) => rule.enabled)
    .slice()
    .sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    if (!matchesRule(rule, crps, context)) continue
    return {
      matchedRuleId: rule.id,
      matchedRuleName: rule.name,
      containmentLevel: rule.action.level,
      explanation: renderTemplate(rule.action.explainTemplate, crps),
      action: rule.action,
    }
  }

  const fallback = actionForLevel(crps.recommendedLevel)
  return {
    matchedRuleId: null,
    matchedRuleName: null,
    containmentLevel: crps.recommendedLevel,
    explanation: renderTemplate('Default policy applied for risk score {impactScore}.', crps),
    action: fallback,
  }
}

export const DEFAULT_GOVERNANCE_RULES: GovernancePolicyRule[] = [
  {
    id: 'default-l3-high-impact-low-reversibility',
    name: 'L3: High impact and low reversibility',
    enabled: true,
    priority: 100,
    conditions: {
      impactScoreGte: 85,
      reversibilityScoreLte: 30,
    },
    action: {
      ...actionForLevel(3),
      explainTemplate:
        'Execution blocked: impact {impactScore} with reversibility {reversibilityScore} crossed emergency threshold.',
    },
  },
  {
    id: 'default-l3-redline',
    name: 'L3: Red-line match',
    enabled: true,
    priority: 95,
    conditions: {
      redLineMatch: true,
    },
    action: {
      ...actionForLevel(3),
      explainTemplate: 'Execution blocked due to red-line policy match in domains: {domains}.',
    },
  },
  {
    id: 'default-l2-missing-approvals',
    name: 'L2: High impact with approvals missing',
    enabled: true,
    priority: 80,
    conditions: {
      impactScoreGte: 70,
      approvalsMissing: true,
    },
    action: {
      ...actionForLevel(2),
      explainTemplate:
        'Approval checkpoint required: impact {impactScore} is high and required approvals are missing.',
    },
  },
  {
    id: 'default-l2-legal-security-confidence',
    name: 'L2: Legal/security domain with high confidence',
    enabled: true,
    priority: 70,
    conditions: {
      domainsIncludeAny: ['legal', 'security'],
      confidenceGte: 0.7,
    },
    action: {
      ...actionForLevel(2),
      explainTemplate:
        'Approval checkpoint required for sensitive domains ({domains}) with confidence {impactScore}.',
    },
  },
  {
    id: 'default-l1-baseline',
    name: 'L1: Baseline containment',
    enabled: true,
    priority: 10,
    conditions: {
      impactScoreGte: 50,
    },
    action: {
      ...actionForLevel(1),
      explainTemplate: 'Soft containment applied for medium/high risk impact {impactScore}.',
    },
  },
]
