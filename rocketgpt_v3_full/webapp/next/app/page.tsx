'use client'

import { useEffect, useMemo, useState } from 'react'

import DecisionBanner from '@/components/DecisionBanner'
import { HistoryList } from '@/components/HistoryList'
import MessageBubble from '@/components/MessageBubble'
import PlanPanel from '@/components/PlanPanel'
import PromptBar from '@/components/PromptBar'
import QuickResponderButton from '@/components/QuickResponderButton'
import Skeleton from '@/components/Skeleton'
import Toolcard from '@/components/Toolcard'
import ToolRunner from '@/components/ToolRunner'
import { plan as apiPlan, recommend as apiRecommend } from '@/lib/api'
import { isRateLimitError } from '@/lib/errors'
import { emitRateLimited } from '@/lib/ratelimitBus'
import type { Recommendation } from '@/lib/store'
import { useChat } from '@/lib/store'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export const dynamic = 'force-dynamic'

export default function Page() {
  const {
    messages,
    addMsg,
    plan,
    setPlan,
    decision,
    setDecision,
    recs,
    setRecs,
    loading,
    setLoading,
    reset,
    openRunner,
    setController,
  } = useChat()

  const [firstRun, setFirstRun] = useState(true)
  const [lastGoal, setLastGoal] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Supabase (browser) client
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

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
    addMsg({
      id: thinkingId,
      role: 'assistant',
      text: 'Okayâ€”give me a moment to think this throughâ€¦',
    })

    const controller = new AbortController()
    setController(controller)

    try {
      // ---------- PLAN STAGE ----------
      const p = await apiPlan(
        text,
        { preferences: ['free tools only'] },
        { signal: controller.signal },
      )
      setPlan(p.plan || [])
      setDecision(p.decision)

      // replace thinking message with summary
      useChat.getState().updateMsg(thinkingId, {
        text: p.decision?.summary || 'Hereâ€™s a quick plan you can follow:',
      })

      // ---------- SAVE TO SUPABASE (browser) ----------
      try {
        await supabase.from('user_prompts').insert({
          goal: text,
          decision_summary: p?.decision?.summary ?? null,
          email: (await supabase.auth.getUser()).data.user?.email ?? null,
        })
      } catch (saveErr) {
        console.warn('Supabase save skipped:', saveErr)
      }

      // ---------- RECOMMEND STAGE ----------
      try {
        const r = await apiRecommend(
          text,
          p.plan,
          { optimize: 'balanced' },
          { signal: controller.signal },
        )
        const list = (r.recommendations || []) as Recommendation[]
        let chatter = 0
        for (const item of list) {
          setRecs((prev) => [...prev, item])
          if (chatter < 2) {
            addMsg({
              id: crypto.randomUUID(),
              role: 'assistant',
              text: `You could also try **${item.title}** â€” ${item.why}`,
            })
            chatter++
          }
          await new Promise((res) => setTimeout(res, 160))
        }
      } catch (err: unknown) {
        if (isRateLimitError(err)) {
          // Show banner + inline message
          emitRateLimited({
            message: 'Youâ€™ve hit your planâ€™s rate limit while fetching recommendations.',
            retryAfter: err.retryAfter ?? err.rl?.retry_after_seconds,
            plan: err.rl?.limits?.plan_code,
          })
          addMsg({
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'I drafted the plan, but youâ€™re currently rate-limited. Please retry shortly or upgrade your plan.',
          })
          return
        }
        addMsg({
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'I drafted the plan, but tool suggestions are temporarily unavailable.',
        })
        console.error('recommend error', err)
      }
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        emitRateLimited({
          message: 'Youâ€™ve hit your planâ€™s rate limit while planning.',
          retryAfter: err.retryAfter ?? err.rl?.retry_after_seconds,
          plan: err.rl?.limits?.plan_code,
        })
        useChat.getState().updateMsg(thinkingId, {
          text: 'Iâ€™m currently rate-limited. Please retry shortly or consider upgrading your plan.',
        })
      } else {
        useChat.getState().updateMsg(thinkingId, {
          text: 'Hmmâ€¦ something went wrong while planning. Try rephrasing and Iâ€™ll rethink it.',
        })
        console.error('plan error', err)
      }
    } finally {
      setLoading(false)
      setController(undefined)
    }
  }

  return (
    <div className="container py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      {/* ðŸ‘‹ Welcome banner */}
      <div className="col-span-full rounded-md border bg-white p-4 mb-4">
        {userEmail ? (
          <div className="text-lg font-medium text-gray-800">
            Welcome <span className="font-semibold text-black">{userEmail}</span> â€” to{' '}
            <b>RocketGPT</b>, your AI Orchestrator.
          </div>
        ) : (
          <div className="text-lg font-medium text-gray-600">
            Welcome to <b>RocketGPT</b> â€” please{' '}
            <a href="/login" className="underline">
              sign in
            </a>{' '}
            to unlock full features.
          </div>
        )}
      </div>

      {/* ðŸ’¬ Left: Conversation */}
      <div className="space-y-4">
        {/* Prompt + Quick test button (Edge Function) */}
        <div className="flex items-center gap-3">
          <PromptBar onSend={onSend} loading={loading} />
          <QuickResponderButton />
        </div>

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

        {/* ðŸ›  Recommendations */}
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

      {/* ðŸ§© Right: Plan + Estimates + History */}
      <div className="space-y-4">
        {loading && plan.length === 0 ? <Skeleton className="h-48" /> : <PlanPanel plan={plan} />}

        <div className="card p-4">
          <div className="font-semibold mb-2">Estimates</div>
          {decision?.estimates ? (
            <div className="text-sm">
              <div>Cost: â‚¹ {Math.round(decision.estimates.costINR)}</div>
              <div>ETA: {decision.estimates.minutes} minutes</div>
              <div>Steps: {decision.estimates.steps}</div>
            </div>
          ) : (
            <div className="text-muted text-sm">
              {firstRun ? 'Run a goal to see estimates.' : 'No estimates yet.'}
            </div>
          )}
        </div>

        {/* ðŸ•“ History list (live updates + re-run) */}
        <HistoryList onRerun={(goal: string) => onSend(goal)} />

        <button className="btn w-full" onClick={() => reset()}>
          Reset
        </button>

        <div className="text-xs text-muted">
          API: {process.env.NEXT_PUBLIC_CORE_API_BASE || 'not set'}
        </div>
      </div>

      {/* âš™ï¸ Runner modal */}
      <ToolRunner />
    </div>
  )
}
