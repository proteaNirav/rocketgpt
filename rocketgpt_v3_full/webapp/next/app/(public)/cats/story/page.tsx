'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { suggestCats } from '@/lib/cats-suggest'
import { SEED_CATS } from '@/lib/cats-seed'
import { isDemoMode } from '@/lib/demo-mode'
import {
  buildWorkflowArtifactFromSuggestions,
  saveWorkflowDraftToStorage,
} from '@/lib/workflow-draft'
import { WorkflowArtifact, WorkflowNode } from '@/lib/workflow-types'
import { validateWorkflow } from '@/lib/workflow-validate'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SAMPLE_PROMPTS = [
  'Design a governed replay workflow for incident postmortem evidence.',
  'Build a sales automation flow with approvals and reporting outputs.',
  'Create a compliance-first vendor onboarding workflow with risk checks.',
  'Plan a data quality and analytics workflow that ends in executive reporting.',
  'Set up an HR onboarding and training compliance orchestration flow.',
  'Compose a CI release governance flow with policy gates and audit artifacts.',
]

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function moveNode(nodes: WorkflowNode[], nodeId: string, direction: -1 | 1): WorkflowNode[] {
  const index = nodes.findIndex((node) => node.node_id === nodeId)
  const next = index + direction
  if (index < 0 || next < 0 || next >= nodes.length) return nodes
  const copy = [...nodes]
  ;[copy[index], copy[next]] = [copy[next], copy[index]]
  return copy
}

export default function CatsStoryPage() {
  const router = useRouter()
  const demoMode = isDemoMode()

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      role: 'assistant',
      content:
        'Describe your goal. I will suggest 3-5 CATs from the seed catalog and keep a workflow draft ready.',
    },
  ])
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [initParamDrafts, setInitParamDrafts] = useState<Record<string, string>>({})
  const [initParamErrors, setInitParamErrors] = useState<Record<string, string>>({})

  const conversationText = useMemo(
    () => [...messages.map((m) => m.content), input].filter(Boolean).join('\n'),
    [input, messages],
  )

  const suggestions = useMemo(() => suggestCats(conversationText, SEED_CATS), [conversationText])

  const nodesForValidation = useMemo(
    () =>
      nodes.map((node) => {
        const raw = initParamDrafts[node.node_id]
        if (typeof raw !== 'string') return node
        try {
          const parsed = JSON.parse(raw || '{}')
          return { ...node, init_params: parsed }
        } catch {
          return { ...node, init_params: raw }
        }
      }),
    [initParamDrafts, nodes],
  )

  useEffect(() => {
    setNodes((current) => {
      const byCatId = new Map(current.map((node) => [node.cat_id, node]))
      return suggestions.map((suggestion, index) => {
        const existing = byCatId.get(suggestion.item.cat_id)
        if (!existing) {
          const nodeId = `story-node-${index + 1}-${suggestion.item.cat_id.toLowerCase()}`
          const nextNode: WorkflowNode = {
            node_id: nodeId,
            cat_id: suggestion.item.cat_id,
            canonical_name: suggestion.item.canonical_name,
            name: suggestion.item.name,
            purpose: suggestion.item.purpose,
            allowed_side_effects: suggestion.item.allowed_side_effects,
            requires_approval: suggestion.item.requires_approval,
            passport_required: suggestion.item.passport_required,
            selection_reason: suggestion.reason,
            score: suggestion.score,
            init_params: {},
            expected_behavior: `Run ${suggestion.item.name} and validate result for this goal.`,
            expected_outputs: [
              {
                id: `${suggestion.item.cat_id}-out-1`,
                label: 'Output is deterministic',
                checked: false,
              },
              {
                id: `${suggestion.item.cat_id}-out-2`,
                label: 'No policy violations',
                checked: false,
              },
              {
                id: `${suggestion.item.cat_id}-out-3`,
                label: 'Evidence generated',
                checked: false,
              },
            ],
          }
          setInitParamDrafts((drafts) => ({ ...drafts, [nodeId]: '{}' }))
          return nextNode
        }
        return {
          ...existing,
          selection_reason: suggestion.reason,
          score: suggestion.score,
        }
      })
    })
  }, [suggestions])

  const artifact = useMemo<WorkflowArtifact>(
    () =>
      buildWorkflowArtifactFromSuggestions(
        suggestions.map((suggestion) => ({
          ...suggestion,
          reason:
            nodes.find((node) => node.cat_id === suggestion.item.cat_id)?.selection_reason ||
            suggestion.reason,
        })),
        conversationText,
      ),
    [conversationText, nodes, suggestions],
  )

  const artifactForValidation = useMemo<WorkflowArtifact>(
    () => ({
      ...artifact,
      nodes: nodesForValidation,
      side_effects_summary: {
        union: Array.from(
          new Set(nodesForValidation.flatMap((node) => node.allowed_side_effects)),
        ).sort() as WorkflowArtifact['side_effects_summary']['union'],
        includes_workflow_dispatch: nodesForValidation.some((node) =>
          node.allowed_side_effects.includes('workflow_dispatch'),
        ),
      },
    }),
    [artifact, nodesForValidation],
  )

  const validation = useMemo(
    () => validateWorkflow(artifactForValidation, SEED_CATS),
    [artifactForValidation],
  )

  function sendMessage(text: string) {
    if (!text) return
    const nextUser: ChatMessage = { id: `m-${Date.now()}`, role: 'user', content: text }
    const nextAssistant: ChatMessage = {
      id: `m-${Date.now()}-a`,
      role: 'assistant',
      content: 'Draft refreshed from latest story context.',
    }
    setMessages((current) => [...current, nextUser, nextAssistant])
  }

  function onSend() {
    const text = input.trim()
    sendMessage(text)
    setInput('')
  }

  function updateNode(nodeId: string, updater: (node: WorkflowNode) => WorkflowNode) {
    setNodes((current) => current.map((node) => (node.node_id === nodeId ? updater(node) : node)))
  }

  function applyInitParams(nodeId: string) {
    const raw = initParamDrafts[nodeId] ?? '{}'
    try {
      const parsed = JSON.parse(raw || '{}')
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setInitParamErrors((current) => ({
          ...current,
          [nodeId]: 'Init params must be a JSON object.',
        }))
        return
      }
      setInitParamErrors((current) => {
        const copy = { ...current }
        delete copy[nodeId]
        return copy
      })
      updateNode(nodeId, (current) => ({ ...current, init_params: parsed }))
    } catch {
      setInitParamErrors((current) => ({ ...current, [nodeId]: 'Invalid JSON.' }))
    }
  }

  function createWorkflow() {
    const nextArtifact: WorkflowArtifact = {
      ...artifact,
      nodes: nodesForValidation,
      side_effects_summary: {
        union: Array.from(
          new Set(nodesForValidation.flatMap((node) => node.allowed_side_effects)),
        ).sort() as WorkflowArtifact['side_effects_summary']['union'],
        includes_workflow_dispatch: nodesForValidation.some((node) =>
          node.allowed_side_effects.includes('workflow_dispatch'),
        ),
      },
    }
    saveWorkflowDraftToStorage(nextArtifact)
    router.push(
      `/workflows/builder?from=story&draftId=${encodeURIComponent(nextArtifact.draft_id)}`,
    )
  }

  function onReset() {
    setInput('')
    setMessages([
      {
        id: 'm1',
        role: 'assistant',
        content:
          'Describe your goal. I will suggest 3-5 CATs from the seed catalog and keep a workflow draft ready.',
      },
    ])
    setNodes([])
    setInitParamDrafts({})
    setInitParamErrors({})
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">CATS Story</h1>
      {demoMode ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Demo mode (Supabase not configured)
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Chat</h2>
          <div className="mt-3 h-[28rem] space-y-2 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/30">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded border border-gray-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  {message.role}
                </div>
                <div>{message.content}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSend()
              }}
              placeholder="Example: build a governed incident replay workflow with audit evidence"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              onClick={onSend}
              className="rounded bg-black px-3 py-2 text-sm text-white hover:opacity-90 dark:bg-white dark:text-black"
            >
              Send
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Workflow Draft</h2>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            CATs auto-selected from chat using deterministic keyword, tag, and purpose scoring.
          </p>
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
            <div className="font-semibold">Validation</div>
            <div className="mt-1 text-xs">
              {validation.errors.length} errors, {validation.warnings.length} warnings,{' '}
              {validation.signals.length} signals
            </div>
            <ul className="mt-2 space-y-1 text-xs">
              {validation.errors.slice(0, 2).map((issue) => (
                <li
                  key={`${issue.code}-${issue.node_id || 'global'}-e`}
                  className="text-red-700 dark:text-red-300"
                >
                  [E] {issue.message}
                </li>
              ))}
              {validation.warnings.slice(0, 2).map((issue) => (
                <li
                  key={`${issue.code}-${issue.node_id || 'global'}-w`}
                  className="text-amber-700 dark:text-amber-300"
                >
                  [W] {issue.message}
                </li>
              ))}
              {validation.signals.slice(0, 2).map((signal) => (
                <li key={`${signal.code}-s`} className="text-sky-700 dark:text-sky-300">
                  [S] {signal.message}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 max-h-[28rem] space-y-2 overflow-auto pr-1">
            {nodes.map((node, index) => (
              <div
                key={node.node_id}
                className={`rounded border p-3 ${
                  validation.node[node.node_id]?.errors.length
                    ? 'border-red-300 bg-red-50/30 dark:border-red-900/70 dark:bg-red-950/20'
                    : validation.node[node.node_id]?.warnings.length
                      ? 'border-amber-300 bg-amber-50/30 dark:border-amber-900/70 dark:bg-amber-950/20'
                      : 'border-gray-200 dark:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">
                      {index + 1}. {node.name}
                    </div>
                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {node.cat_id}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {node.canonical_name}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setNodes((current) => moveNode(current, node.node_id, -1))}
                      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
                    >
                      Up
                    </button>
                    <button
                      onClick={() => setNodes((current) => moveNode(current, node.node_id, 1))}
                      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
                    >
                      Down
                    </button>
                    <button
                      onClick={() =>
                        setNodes((current) =>
                          current.filter((item) => item.node_id !== node.node_id),
                        )
                      }
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-900 dark:text-red-300"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => downloadJson(`${node.cat_id}-node.json`, node)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
                    >
                      Node JSON
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                  Purpose: {node.purpose}
                </div>
                <div className="mt-1 text-xs text-gray-700 dark:text-gray-200">
                  Side-effects: {node.allowed_side_effects.join(', ')} | Approval:{' '}
                  {node.requires_approval ? 'required' : 'optional'} | Passport:{' '}
                  {node.passport_required ? 'required' : 'optional'}
                </div>
                <div className="mt-1 rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-900 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-100">
                  Selected because: {node.selection_reason}
                </div>
                {validation.node[node.node_id]?.errors.length ? (
                  <ul className="mt-1 space-y-1 text-xs text-red-700 dark:text-red-300">
                    {validation.node[node.node_id].errors.map((issue) => (
                      <li key={`${issue.code}-err`}>[E] {issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                {validation.node[node.node_id]?.warnings.length ? (
                  <ul className="mt-1 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {validation.node[node.node_id].warnings.map((issue) => (
                      <li key={`${issue.code}-warn`}>[W] {issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                <label className="mt-2 block text-xs">
                  Expected behavior
                  <textarea
                    value={node.expected_behavior}
                    onChange={(event) =>
                      updateNode(node.node_id, (current) => ({
                        ...current,
                        expected_behavior: event.target.value,
                      }))
                    }
                    className="mt-1 h-16 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
                <label className="mt-2 block text-xs">
                  Init params (JSON)
                  <textarea
                    value={
                      initParamDrafts[node.node_id] ?? JSON.stringify(node.init_params, null, 2)
                    }
                    onChange={(event) =>
                      setInitParamDrafts((current) => ({
                        ...current,
                        [node.node_id]: event.target.value,
                      }))
                    }
                    className="mt-1 h-20 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => applyInitParams(node.node_id)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
                  >
                    Apply Params
                  </button>
                  {initParamErrors[node.node_id] ? (
                    <span className="text-xs text-red-700 dark:text-red-300">
                      {initParamErrors[node.node_id]}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2">
                  <div className="text-xs font-semibold">Expected outputs checklist</div>
                  <div className="mt-1 space-y-1">
                    {node.expected_outputs.map((output) => (
                      <label key={output.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={output.checked}
                          onChange={() =>
                            updateNode(node.node_id, (current) => ({
                              ...current,
                              expected_outputs: current.expected_outputs.map((item) =>
                                item.id === output.id ? { ...item, checked: !item.checked } : item,
                              ),
                            }))
                          }
                        />
                        <input
                          value={output.label}
                          onChange={(event) =>
                            updateNode(node.node_id, (current) => ({
                              ...current,
                              expected_outputs: current.expected_outputs.map((item) =>
                                item.id === output.id
                                  ? { ...item, label: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {nodes.length === 0 ? (
              <div className="rounded border border-gray-200 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
                Start chatting to generate a draft with 3-5 suggested CATs.
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={createWorkflow}
          disabled={nodes.length === 0 || validation.errors.length > 0}
          className="rounded bg-black px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Create Workflow
        </button>
        <button
          onClick={() =>
            downloadJson('cats-story-workflow-draft.json', {
              ...artifact,
              nodes: nodesForValidation,
              validation,
            })
          }
          disabled={nodes.length === 0}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Download JSON
        </button>
        <button
          onClick={onReset}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
