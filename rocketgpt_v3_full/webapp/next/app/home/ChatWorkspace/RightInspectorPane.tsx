'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

import { useHomeChat } from './useHomeChat'

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function LegacyInspector() {
  return (
    <aside className="h-full border-l border-slate-900/80 bg-slate-950/80 p-3 flex flex-col overflow-y-auto space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inspector</div>
      <InspectorCard title="Environment">
        <Item label="Plan" value="Bronze (static)" />
        <Item label="Model" value="GPT-5.1 Thinking (static)" />
        <Item label="Environment" value="Local Dev (static)" />
      </InspectorCard>
      <InspectorCard title="Context">
        <Item label="Project" value="rocketgpt-vNext" />
        <Item label="Branch" value="main" />
        <Item label="Updated" value="Just now" />
      </InspectorCard>
      <InspectorCard title="Rate Limit">
        <Item label="Requests Used" value="12 / 100 (static)" />
        <Item label="Tokens Remaining" value="-" />
        <Item label="Reset In" value="59m (static)" />
      </InspectorCard>
      <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-900/70">
        Enable Design Mode in chat to edit the seeded workflow draft.
      </div>
    </aside>
  )
}

export default function RightInspectorPane() {
  const router = useRouter()
  const {
    designModeEnabled,
    draftArtifact,
    validation,
    initParamDrafts,
    initParamErrors,
    setNodeExpectedBehavior,
    setInitParamDraft,
    applyInitParams,
    toggleNodeOutput,
    updateNodeOutputLabel,
    addNodeOutput,
    removeNodeOutput,
  } = useHomeChat()

  if (!designModeEnabled) return <LegacyInspector />

  const canCreateWorkflow = Boolean(draftArtifact && validation && validation.errors.length === 0)

  return (
    <aside className="h-full border-l border-slate-900/80 bg-slate-950/80 p-3 flex flex-col overflow-y-auto space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
        Design Mode
      </div>

      {!draftArtifact || !validation ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
          Send a chat goal to generate a 3-5 CAT workflow draft.
        </div>
      ) : (
        <>
          <InspectorCard title="Workflow Draft">
            <Item label="Draft ID" value={draftArtifact.draft_id} />
            <Item label="Source" value={draftArtifact.source} />
            <Item label="Nodes" value={String(draftArtifact.nodes.length)} />
          </InspectorCard>

          <InspectorCard title="Validation">
            <Item label="Errors" value={String(validation.errors.length)} />
            <Item label="Warnings" value={String(validation.warnings.length)} />
            <Item label="Signals" value={String(validation.signals.length)} />
            <div className="text-[11px] text-slate-300">
              approval={validation.governanceSummary.anyRequiresApproval ? 'required' : 'optional'}{' '}
              | passport=
              {validation.governanceSummary.anyRequiresPassport ? 'required' : 'optional'}
            </div>
            <div className="text-[11px] text-slate-400">
              side-effects: {validation.governanceSummary.sideEffects.join(', ') || 'none'}
            </div>
            <div className="text-[11px] text-slate-400">
              elevated: {validation.governanceSummary.anyElevated ? 'true' : 'false'}
            </div>
          </InspectorCard>

          <div className="space-y-2">
            {draftArtifact.nodes.map((node, index) => (
              <div
                key={node.node_id}
                className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2"
              >
                <div className="text-[11px] font-semibold text-slate-100">
                  {index + 1}. {node.name}
                </div>
                <div className="font-mono text-[10px] text-slate-400">{node.cat_id}</div>
                <div className="text-[10px] text-slate-400">{node.canonical_name}</div>
                <div className="text-[10px] text-sky-200">Why: {node.selection_reason}</div>

                <label className="block text-[10px] text-slate-300">
                  Init params (JSON object)
                  <textarea
                    value={
                      initParamDrafts[node.node_id] ??
                      JSON.stringify(node.init_params || {}, null, 2)
                    }
                    onChange={(event) => setInitParamDraft(node.node_id, event.target.value)}
                    className="mt-1 h-20 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-100"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyInitParams(node.node_id)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                  >
                    Apply
                  </button>
                  {initParamErrors[node.node_id] ? (
                    <span className="text-[10px] text-rose-300">
                      {initParamErrors[node.node_id]}
                    </span>
                  ) : null}
                </div>

                <label className="block text-[10px] text-slate-300">
                  Expected behavior
                  <textarea
                    value={node.expected_behavior}
                    onChange={(event) => setNodeExpectedBehavior(node.node_id, event.target.value)}
                    className="mt-1 h-16 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
                  />
                </label>

                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-200">Expected outputs</div>
                  {node.expected_outputs.map((output) => (
                    <div key={output.id} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={output.checked}
                        onChange={() => toggleNodeOutput(node.node_id, output.id)}
                      />
                      <input
                        value={output.label}
                        onChange={(event) =>
                          updateNodeOutputLabel(node.node_id, output.id, event.target.value)
                        }
                        className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeNodeOutput(node.node_id, output.id)}
                        className="rounded border border-rose-800 bg-rose-950/20 px-1.5 py-1 text-[10px] text-rose-200"
                        title="Remove output"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addNodeOutput(node.node_id)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100"
                  >
                    Add output
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 space-y-2">
            <button
              type="button"
              disabled={!canCreateWorkflow}
              onClick={() =>
                router.push(
                  `/workflows/builder?from=chat&draftId=${encodeURIComponent(draftArtifact.draft_id)}`,
                )
              }
              className="w-full rounded bg-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-50 disabled:opacity-50"
            >
              Create Workflow
            </button>
            <button
              type="button"
              onClick={() =>
                downloadJson('chat-workflow-draft.json', { ...draftArtifact, validation })
              }
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
            >
              Download Draft JSON
            </button>
          </div>
        </>
      )}
    </aside>
  )
}

function InspectorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2">
      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-right text-slate-300">{value}</span>
    </div>
  )
}
