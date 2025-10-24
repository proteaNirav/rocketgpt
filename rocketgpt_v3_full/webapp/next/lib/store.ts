import { create } from 'zustand'

export type Msg = { id: string; role: 'user'|'assistant'; text: string }
export type Step = { id: string; title: string; detail?: string; status?: 'pending'|'running'|'done'|'skipped'|'failed' }
export type Estimates = { costINR: number; minutes: number; steps: number; confidence?: number }
export type Decision = { summary: string; toolId?: string|null; estimates: Estimates }

export type Recommendation = {
  toolId: string; title: string; why: string; avoidWhen?: string;
  estimates: Estimates; badges?: { reliability?: number; pricing?: 'free'|'freemium'|'paid' }
}

export type ToolRunPayload = {
  toolId: string
  goal: string
  plan: Step[]
}

type State = {
  // existing:
  messages: Msg[]
  plan: Step[]
  decision?: Decision
  recs: Recommendation[]
  loading: boolean
  addMsg: (m: Msg) => void
  setPlan: (p: Step[]) => void
  setDecision: (d: Decision) => void
  setRecs: (r: Recommendation[]) => void
  setLoading: (v: boolean) => void
  reset: () => void

  // NEW: runner modal state
  runnerOpen: boolean
  selectedTool: ToolRunPayload | null
  openRunner: (p: ToolRunPayload) => void
  closeRunner: () => void
}

export const useChat = create<State>((set) => ({
  // existing defaults:
  messages: [],
  plan: [],
  recs: [],
  loading: false,
  addMsg: (m) => set(s => ({ messages: [...s.messages, m] })),
  setPlan: (p) => set({ plan: p }),
  setDecision: (d) => set({ decision: d }),
  setRecs: (r) => set({ recs: r }),
  setLoading: (v) => set({ loading: v }),
  reset: () => set({ messages: [], plan: [], recs: [], decision: undefined }),

  // NEW defaults:
  runnerOpen: false,
  selectedTool: null,
  openRunner: (p) => set({ runnerOpen: true, selectedTool: p }),
  closeRunner: () => set({ runnerOpen: false, selectedTool: null }),
}))
