import { WorkflowNode, WorkflowStepResult } from '@/lib/workflow-types'

export type WorkflowRunSignal = {
  stopped: boolean
}

export type WorkflowRunCallbacks = {
  onStepUpdate?: (result: WorkflowStepResult) => void
}

export type WorkflowRunInput = {
  workflowId: string
  nodes: WorkflowNode[]
  signal: WorkflowRunSignal
  callbacks?: WorkflowRunCallbacks
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildOutputSummary(node: WorkflowNode, success: boolean, score: number): string {
  if (!success) {
    return `${node.name} encountered a deterministic demo failure at score ${score}.`
  }
  return `${node.name} completed successfully with deterministic score ${score}.`
}

export async function executeWorkflowRun(
  input: WorkflowRunInput,
): Promise<{ stopped: boolean; results: WorkflowStepResult[] }> {
  const results: WorkflowStepResult[] = []

  for (const node of input.nodes) {
    if (input.signal.stopped) {
      break
    }

    const stepSeed = hashString(`${input.workflowId}:${node.node_id}`)
    const random = seededRandom(stepSeed)
    const durationMs = 250 + Math.floor(random() * 1200)
    const failChance = random()
    const score = Math.floor(random() * 1000)

    const startedAt = nowIso()
    const runningState: WorkflowStepResult = {
      stepId: node.node_id,
      catId: node.cat_id,
      status: 'running',
      startedAt,
      endedAt: startedAt,
      durationMs: 0,
      outputSummary: `Running ${node.name}...`,
      outputJson: {
        node_id: node.node_id,
        cat_id: node.cat_id,
        phase: 'running',
      },
      artifacts: [],
    }

    results.push(runningState)
    input.callbacks?.onStepUpdate?.(runningState)

    await sleep(Math.max(150, Math.floor(durationMs / 2)))
    if (input.signal.stopped) {
      break
    }

    const success = failChance >= 0.16
    const endedAt = nowIso()
    const finalState: WorkflowStepResult = {
      ...runningState,
      status: success ? 'success' : 'failed',
      endedAt,
      durationMs,
      outputSummary: buildOutputSummary(node, success, score),
      outputJson: {
        node_id: node.node_id,
        cat_id: node.cat_id,
        deterministic_seed: stepSeed,
        deterministic_score: score,
        result: success ? 'ok' : 'error',
        summary: buildOutputSummary(node, success, score),
      },
    }

    results[results.length - 1] = finalState
    input.callbacks?.onStepUpdate?.(finalState)

    await sleep(Math.max(100, Math.floor(durationMs / 3)))
  }

  return {
    stopped: input.signal.stopped,
    results,
  }
}
