import type { PlannerRequest } from '@/types/planner'

export function getPlannerSystemPrompt(): string {
  return [
    'You are the **Neural Planner** inside RocketGPT.',
    'Your job is to break a user goal into clear, executable steps for downstream agents.',
    '',
    'Requirements:',
    '- Think in terms of steps that can be executed by code, tools, or agents.',
    '- Avoid vague actions like ""analyze"" without specifying what and how.',
    '- Respect constraints such as maxSteps and maxTokens where provided.',
    '- Prefer fewer, meaningful steps over dozens of micro-steps.',
    '',
    'Output Format:',
    '- You must ONLY return valid JSON matching the PlannerResponse schema.',
    '- Do not add commentary, markdown, or natural language outside the JSON.',
  ].join('\n')
}

export function buildPlanningPrompt(req: PlannerRequest): string {
  const lines: string[] = []

  lines.push('User Goal:')
  lines.push(req.goal.trim())
  lines.push('')

  if (req.context) {
    lines.push('Context:')
    lines.push(req.context.trim())
    lines.push('')
  }

  if (req.constraints) {
    lines.push('Constraints:')
    lines.push(JSON.stringify(req.constraints))
    lines.push('')
  }

  if (req.preferences) {
    lines.push('Preferences:')
    lines.push(JSON.stringify(req.preferences))
    lines.push('')
  }

  lines.push('Now generate a structured plan as JSON (PlannerResponse).')
  return lines.join('\n')
}
