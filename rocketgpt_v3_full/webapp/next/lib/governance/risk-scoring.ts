import type {
  RiskDomain,
  RiskScoringInput,
  CrpsSignature,
  CrpsCat,
  ContainmentLevel,
} from './types'
import { createParamsFingerprint, sha256Hex } from './redaction'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function deriveDomains(input: RiskScoringInput): RiskDomain[] {
  const domains = new Set<RiskDomain>()
  for (const node of input.nodes) {
    if (node.allowed_side_effects.includes('workflow_dispatch')) {
      domains.add('security')
      domains.add('financial')
      domains.add('safety')
      domains.add('workforce')
    }
    if (node.allowed_side_effects.includes('ledger_write')) {
      domains.add('legal')
      domains.add('financial')
      domains.add('privacy')
    }
    if (node.allowed_side_effects.includes('read_only')) {
      domains.add('privacy')
    }
    const text = `${node.name} ${node.purpose}`.toLowerCase()
    if (/emission|climate|energy|waste|water|environment/.test(text)) domains.add('env')
    if (/legal|compliance|contract|regulat/.test(text)) domains.add('legal')
    if (/security|auth|vulnerability|exploit/.test(text)) domains.add('security')
    if (/pay|pricing|revenue|cost|budget|invoice/.test(text)) domains.add('financial')
    if (/hiring|employee|staff|workforce|hr/.test(text)) domains.add('workforce')
    if (/privacy|pii|consent|data/.test(text)) domains.add('privacy')
    if (/safety|harm|danger|incident/.test(text)) domains.add('safety')
  }
  return Array.from(domains).sort() as RiskDomain[]
}

function calculateImpact(input: RiskScoringInput, domains: RiskDomain[]): number {
  let base = 25
  for (const node of input.nodes) {
    if (node.allowed_side_effects.includes('workflow_dispatch')) base += 30
    if (node.allowed_side_effects.includes('ledger_write')) base += 20
    if (node.allowed_side_effects.includes('read_only')) base += 5
    if (node.requires_approval) base += 8
    if (node.passport_required) base += 5
  }
  base += domains.length * 3
  return clamp(Math.round(base / Math.max(1, input.nodes.length)), 0, 100)
}

function calculateReversibility(input: RiskScoringInput): number {
  let score = 90
  for (const node of input.nodes) {
    if (node.allowed_side_effects.includes('workflow_dispatch')) score -= 35
    if (node.allowed_side_effects.includes('ledger_write')) score -= 20
    if (node.allowed_side_effects.includes('read_only')) score -= 5
  }
  return clamp(score, 0, 100)
}

function calculateAggressiveness(input: RiskScoringInput): number {
  let score = 20
  for (const node of input.nodes) {
    const text = `${node.name} ${node.purpose} ${node.selection_reason}`.toLowerCase()
    if (/maximize|optimi[sz]e|aggressive|extract|speed|growth|dominat/.test(text)) score += 20
    if (/balanced|safe|compliance|conservative|guard/.test(text)) score -= 10
    if (node.allowed_side_effects.includes('workflow_dispatch')) score += 12
  }
  return clamp(Math.round(score / Math.max(1, input.nodes.length)), 0, 100)
}

function calculateConfidence(input: RiskScoringInput, domains: RiskDomain[]): number {
  const base =
    0.55 + Math.min(0.25, domains.length * 0.03) + Math.min(0.15, input.nodes.length * 0.02)
  return Math.round(clamp(base, 0, 1) * 100) / 100
}

function recommendedLevelFromScores(
  impactScore: number,
  reversibilityScore: number,
  aggressivenessScore: number,
): ContainmentLevel {
  if (impactScore >= 85 && reversibilityScore <= 30) return 3
  if (impactScore >= 70 || aggressivenessScore >= 65) return 2
  if (impactScore >= 50) return 1
  return 1
}

export function computeCrpsSignature(input: RiskScoringInput): CrpsSignature {
  const catsInvolved: CrpsCat[] = input.nodes
    .map((node) => ({
      catId: node.cat_id,
      version: 'unknown',
    }))
    .sort((a, b) => `${a.catId}:${a.version}`.localeCompare(`${b.catId}:${b.version}`))

  const paramsFingerprint = createParamsFingerprint(input.params)
  const riskDomains = deriveDomains(input)
  const impactScore = calculateImpact(input, riskDomains)
  const reversibilityScore = calculateReversibility(input)
  const aggressivenessScore = calculateAggressiveness(input)
  const overrideRate = clamp(input.overrideRate ?? 0, 0, 100)
  const confidence = calculateConfidence(input, riskDomains)
  const recommendedLevel = recommendedLevelFromScores(
    impactScore,
    reversibilityScore,
    aggressivenessScore,
  )
  const evidenceRefs = input.evidenceRefs ?? []

  const sortedCats = catsInvolved.map((cat) => `${cat.catId}@${cat.version}`).join('|')
  const crpsId = sha256Hex(
    `${input.workflowId}|${sortedCats}|${paramsFingerprint}|${riskDomains.slice().sort().join(',')}`,
  )

  return {
    crpsId,
    workflowId: input.workflowId,
    catsInvolved,
    paramsFingerprint,
    riskDomains,
    impactScore,
    reversibilityScore,
    aggressivenessScore,
    overrideRate,
    confidence,
    recommendedLevel,
    evidenceRefs,
  }
}
