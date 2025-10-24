'use client'

import { useState } from 'react'
import { useChat } from '@/lib/store'
import type { Recommendation } from '@/lib/store'
import { plan as apiPlan, recommend as apiRecommend } from '@/lib/api'
import { supabase } from '@/lib/supabase'

import PromptBar from '@/components/PromptBar'
import MessageBubble from '@/components/MessageBubble'
import Toolcard from '@/components/Toolcard'
import DecisionBanner from '@/components/DecisionBanner'
import PlanPanel from '@/components/PlanPanel'
import Skeleton from '@/components/Skeleton'
import ToolRunner from '@/components/ToolRunner'
import { HistoryList } from '@/components/HistoryList'

export default function Page() {
  const {
    messages, addMsg,
    plan, setPlan,
    decision, setDecision,
    recs, setRecs,
    loading, setLoading,
    reset, openRunner, setController,
  } = useChat()

  const [firstRun, setFirstRun] = useState(true)
  const [lastGoal, setLastGoal] = useState('')

  async function onSend(text: string) {
    setLoading(true)
    setFirstRun(false)
    setLastGoal(text)

    // clear previous data
    setRecs([])
    setDecision(undefined)
    addMsg({ id: crypto.randomUUID(), role: 'user', text })

    // friendly thinking message
    const thinkingId = crypto.randomUUID()
    addMsg({ id: thinkingId, role: 'assistant', text: 'Okay, give me a few seconds… thinking 🧠' })

    const controller = new AbortController()
    setController(controller)

    try {
      // 1️⃣ PLAN
      const p = await apiPlan(text, { preferences: ['free tools only'] }, { signal: controller.signal })
      setPlan(p.plan || [])
      setDecision(p.decision)

      // replace thinking message with summary
      useChat.getState().updateMsg(thinkingId, {
        text: p.decision?.summary || 'Here’s a quick plan you can follow:'
      })

      //  save to Supabase (non-blocking)
      supabase.from('user_prompts').insert({
        goal: text,
        decision_summary: p?.decision?.summary ?? null,
        email: (await supabase.auth.getUser()).data.user?.email ?? null,
      }).then(({ error }) => {
        if (error) console.error('Save prompt failed:', error.message)
      })

      // 2️⃣ RECOMMEND - progressive
      const r = await apiRecommend(text, p.plan, { optimize: 'balanced' }, { signal: controller.signal })
      const list = (r.recommendations || []) as Recommendation[]

      for (const item of list) {
        setRecs((prev: Recommendation[]) => [...prev, item])
        addMsg({
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `I’d also consider **${item.title}** — ${item.why}`
        })
        await new Promise(res => setTimeout(res, 200))
      }
    } catch (e: any) {
      useChat.getState().updateMsg(thinkingId, {
        text: 'Hmm… something went wrong. Try rephrasing your request and I’ll rethink it.'
      })
      console.error('onSend error', e)
    } finally {
      setLoading(false)
      setController(undefined)
    }
  }

  return (
    <div className="container py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      {/* 💬 Left: Conversation */}
      <div className="space-y-4">
        <PromptBar onSend={onSend} loading={loading} />

        <div className="space-y-3">
          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} text={m.text} />
          ))}
          {loading && messages.filter((m) => m.role === 'assistant').length === 0 ? (
            <MessageBubble role="assistant" typing text="" />
          ) : null}
        </div>

        {loading && !decision ? (
          <Skeleton className="h-16" />
        ) : decision ? (
          <DecisionBanner summary={decision.summary} estimates={decision.estimates} />
        ) : null}

        {/* 🛠 Recommendations */}
        <div className="space-y-3">
          {loading && recs.length === 0 ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : (
            recs.map((r) => (
              <Toolcard
                key={`${r.toolId}-${r.title}`}
                title={r.title}
                why={r.why}
                pricing={r?.badges?.pricing || 'free'}
                estimates={r.estimates}
                onRun={() => openRunner({ toolId: r.toolId, goal: lastGoal, plan })}
              />
            ))
          )}
        </div>
      </div>

      {/* 🧩 Right: Plan + Estimates + History */}
      <div className="space-y-4">
        {loading && plan.length === 0 ? <Skeleton className="h-48" /> : <PlanPanel plan={plan} />}

        <div className="card p-4">
          <div className="font-semibold mb-2">Estimates</div>
          {decision?.estimates ? (
            <div className="text-sm">
              <div>Cost: ₹ {Math.round(decision.estimates.costINR)}</div>
              <div>ETA: {decision.estimates.minutes} minutes</div>
              <div>Steps: {decision.estimates.steps}</div>
            </div>
          ) : (
            <div className="text-muted text-sm">
              {firstRun ? 'Run a goal to see estimates.' : 'No estimates yet.'}
            </div>
          )}
        </div>

        {/* 🕓 History list (live updates + re-run) */}
        <HistoryList onRerun={(goal) => onSend(goal)} />

        <button className="btn w-full" onClick={() => reset()}>Reset</button>

        <div className="text-xs text-muted">
          API: {process.env.NEXT_PUBLIC_CORE_API_BASE || 'not set'}
        </div>
      </div>

      {/* ⚙️ Runner modal */}
      <ToolRunner />
    </div>
  )
}
