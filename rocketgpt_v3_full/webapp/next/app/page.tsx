'use client'


import { useState, useEffect, useMemo } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export const dynamic = 'force-dynamic';

import { useChat } from '@/lib/store'
import type { Recommendation } from '@/lib/store'
import { plan as apiPlan, recommend as apiRecommend } from '@/lib/api'

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

    // 👋 Welcome banner logic
  const [userEmail, setUserEmail] = useState<string | null>(null)
const supabase = useMemo(() => createSupabaseBrowserClient(), [])

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    const email = data.user?.email ?? null
    setUserEmail(email)
  })
}, [supabase])



  async function onSend(text: string) {
    setLoading(true)
    setFirstRun(false)
    setLastGoal(text)
    setRecs([])
    setDecision(undefined)

    const userMsgId = crypto.randomUUID()
    addMsg({ id: userMsgId, role: 'user', text })

    const thinkingId = crypto.randomUUID()
    addMsg({ id: thinkingId, role: 'assistant', text: 'Okay—give me a moment to think this through…' })

    const controller = new AbortController()
    setController(controller)

    try {
      // ---------- PLAN STAGE ----------
      const p = await apiPlan(text, { preferences: ['free tools only'] }, { signal: controller.signal })
      setPlan(p.plan || [])
      setDecision(p.decision)

      // replace thinking message with summary
      useChat.getState().updateMsg(thinkingId, {
        text: p.decision?.summary || 'Here’s a quick plan you can follow:',
      })

      // ---------- SAVE TO SUPABASE ----------
      try {
        const { getSupabase } = await import('@/lib/supabaseClient')
        const sb = getSupabase()
        if (sb) {
          sb.from('user_prompts')
            .insert({
              goal: text,
              decision_summary: p?.decision?.summary ?? null,
              email: (await sb.auth.getUser()).data.user?.email ?? null,
            })
            .then(({ error }) => {
              if (error) console.error('Save prompt failed:', error.message)
            })
        }
      } catch (saveErr) {
        console.warn('Supabase save skipped:', saveErr)
      }

      // ---------- RECOMMEND STAGE ----------
      try {
        const r = await apiRecommend(text, p.plan, { optimize: 'balanced' }, { signal: controller.signal })
        const list = (r.recommendations || []) as Recommendation[]
        let chatter = 0
        for (const item of list) {
          setRecs(prev => [...prev, item])
          if (chatter < 2) {
            addMsg({
              id: crypto.randomUUID(),
              role: 'assistant',
              text: `You could also try **${item.title}** — ${item.why}`
            })
            chatter++
          }
          await new Promise(res => setTimeout(res, 160))
        }
      } catch (recErr) {
        addMsg({
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'I drafted the plan, but tool suggestions are temporarily unavailable.',
        })
        console.error('recommend error', recErr)
      }

    } catch (planErr) {
      useChat.getState().updateMsg(thinkingId, {
        text: 'Hmm… something went wrong while planning. Try rephrasing and I’ll rethink it.',
      })
      console.error('plan error', planErr)
    } finally {
      setLoading(false)
      setController(undefined)
    }
  }

  return (
    <div className="container py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
            {/* 👋 Welcome banner */}
      <div className="col-span-full rounded-md border bg-white p-4 mb-4">
        {userEmail ? (
          <div className="text-lg font-medium text-gray-800">
            Welcome <span className="font-semibold text-black">{userEmail}</span> — to <b>RocketGPT</b>, your AI Orchestrator.
          </div>
        ) : (
          <div className="text-lg font-medium text-gray-600">
            Welcome to <b>RocketGPT</b> — please <a href="/login" className="underline">sign in</a> to unlock full features.
          </div>
        )}
      </div>

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

        <button className="btn w-full" onClick={() => reset()}>
          Reset
        </button>

        <div className="text-xs text-muted">
          API: {process.env.NEXT_PUBLIC_CORE_API_BASE || 'not set'}
        </div>
      </div>

      {/* ⚙️ Runner modal */}
      <ToolRunner />
    </div>
  )
}
