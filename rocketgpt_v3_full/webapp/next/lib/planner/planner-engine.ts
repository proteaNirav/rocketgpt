import type { PlannerRequest, PlannerResponse, PlanStep } from '@/types/planner'
import { buildPlanningPrompt, getPlannerSystemPrompt } from './planner-prompts'

const OPENAI_URL = process.env.OPENAI_API_URL ?? 'https://api.openai.com/v1/chat/completions'

const OPENAI_MODEL = process.env.RGPT_PLANNER_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'

function buildMockPlannerResponse(request: PlannerRequest): PlannerResponse {
  const now = new Date().toISOString()

  const steps: PlanStep[] = [
    {
      id: 'step-1',
      title: 'Clarify requirements and constraints',
      description:
        'Review the user goal, clarify success criteria, constraints, and environment details for RocketGPT.',
      type: 'analysis',
      dependsOn: [],
      outputs: ['requirements_summary'],
      parallelGroup: undefined,
    },
    {
      id: 'step-2',
      title: 'Design high-level workflow',
      description:
        'Break the goal into 3-7 major stages that RocketGPT agents or tools can execute in sequence or parallel.',
      type: 'decision',
      dependsOn: ['step-1'],
      outputs: ['workflow_outline'],
      parallelGroup: undefined,
    },
    {
      id: 'step-3',
      title: 'Define executable actions',
      description:
        'For each stage of the workflow, define concrete actions with clear inputs, outputs, and owners (agent, human, or tool).',
      type: 'action',
      dependsOn: ['step-2'],
      outputs: ['action_plan'],
      parallelGroup: undefined,
    },
  ]

  return {
    goal: request.goal,
    steps,
    metadata: {
      createdAt: now,
      modelUsed: 'mock-planner',
      tokens: 0,
      latencyMs: 0,
    },
  }
}

export async function runPlanner(request: PlannerRequest): Promise<PlannerResponse> {
  const mockFlag = (process.env.RGPT_PLANNER_MOCK || '').toLowerCase()
  const mockEnabled = mockFlag === '1' || mockFlag === 'true' || mockFlag === 'yes'

  if (mockEnabled) {
    return buildMockPlannerResponse(request)
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not configured for Planner engine and mock mode is disabled.',
    )
  }

  const systemPrompt = getPlannerSystemPrompt()
  const userPrompt = buildPlanningPrompt(request)

  const startedAt = Date.now()

  const temperature =
    typeof request.model?.temperature === 'number' ? request.model.temperature : 0.2

  const maxTokens = request.model?.maxTokens ?? request.constraints?.maxTokens ?? 1024

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  })

  const latencyMs = Date.now() - startedAt

  if (!resp.ok) {
    let text = ''
    try {
      text = await resp.text()
    } catch {
      text = ''
    }

    // If quota error, fall back to mock plan so the system remains usable
    if (resp.status === 429) {
      return buildMockPlannerResponse(request)
    }

    throw new Error('Planner LLM call failed: ' + resp.status + ' ' + resp.statusText + ' ' + text)
  }

  const data: any = await resp.json()

  const content =
    data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : null

  if (!content || typeof content !== 'string') {
    throw new Error('Planner LLM returned empty or invalid content.')
  }

  let parsed: PlannerResponse

  try {
    parsed = JSON.parse(content) as PlannerResponse
  } catch (err: any) {
    const message = err && err.message ? err.message : 'Unknown JSON parse error'
    throw new Error('Failed to parse planner JSON: ' + message)
  }

  if (!parsed.goal || !Array.isArray(parsed.steps)) {
    throw new Error('Planner response is missing required fields: goal/steps.')
  }

  const meta = parsed.metadata ?? {
    createdAt: new Date().toISOString(),
    modelUsed: OPENAI_MODEL,
    tokens: 0,
    latencyMs,
  }

  if (!meta.createdAt) meta.createdAt = new Date().toISOString()
  if (!meta.modelUsed) meta.modelUsed = OPENAI_MODEL
  if (typeof meta.tokens !== 'number') meta.tokens = 0
  if (typeof meta.latencyMs !== 'number') meta.latencyMs = latencyMs

  parsed.metadata = meta

  return parsed
}
