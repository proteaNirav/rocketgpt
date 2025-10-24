import { create } from 'zustand'

/* -----------------------------
   Core Type Definitions
------------------------------ */

export type Msg = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type Step = {
  id: string
  title: string
  detail?: string
  status?: 'pending' | 'running' | 'done' | 'skipped' | 'failed'
}

export type Estimates = {
  costINR: number
  minutes: number
  steps: number
  confidence?: number
}

export type Decision = {
  summary: string
  toolId?: string | null
  estimates: Estimates
}

export type Recommendation = {
  toolId: string
  title: string
  why: string
  avoidWhen?: string
  estimates: Estimates
  badges?: {
    reliability?: number
    pricing?: 'free' | 'freemium' | 'paid'
  }
}

export type ToolRunPayload = {
  toolId: string
  goal: string
  plan: Step[]
}

/* -----------------------------
   Zustand Store Definition
------------------------------ */

type State = {
  // chat + plan state
  messages: Msg[]
  plan: Step[]
  decision?: Decision
  recs: Recommendation[]
  loading: boolean
  controller?: AbortController

  // actions
  addMsg: (m: Msg) => void
  setPlan: (p: Step[]) => void
  setDecision: (d: Decision | undefined) => void
  setRecs: (
    r: Recommendation[] | ((prev: Recommendation[]) => Recommendation[])
  ) => void
  setLoading: (v: boolean) => void
  setController: (c?: AbortController) => void
  reset: () => void

  // runner modal state
  runnerOpen: boolean
  selectedTool: ToolRunPayload | null
  openRunner: (p: ToolRunPayload) => void
  closeRunner: () => void
}

/* -----------------------------
   Store Implementation
------------------------------ */

export const useChat = create<State>((set) => ({
  messages: [],
  plan: [],
  recs: [],
  loading: false,
  controller: undefined,

  addMsg: (m) => set((s) => ({ messages: [...s.messages, m] })),
  setPlan: (p) => set({ plan: p }),
  setDecision: (d) => set({ decision: d }),

  // allow both direct array & updater function
  setRecs: (r) =>
    set((s) => ({
      recs:
        typeof r === 'function'
          ? (r as (p: Recommendation[]) => Recommendation[])(s.recs)
          : r,
    })),

  setLoading: (v) => set({ loading: v }),
  setController: (c) => set({ controller: c }),

  reset: () =>
    set({
      messages: [],
      plan: [],
      recs: [],
      decision: undefined,
      controller: undefined,
      loading: false,
    }),

  runnerOpen: false,
  selectedTool: null,
  openRunner: (p) => set({ runnerOpen: true, selectedTool: p }),
  closeRunner: () => set({ runnerOpen: false, selectedTool: null }),
}))
