'use client'
import { useChat } from '@/lib/store'
import { plan as apiPlan, recommend as apiRecommend } from '@/lib/api'
import PromptBar from '@/components/PromptBar'
import MessageBubble from '@/components/MessageBubble'
import Toolcard from '@/components/Toolcard'
import DecisionBanner from '@/components/DecisionBanner'
import PlanPanel from '@/components/PlanPanel'
import Skeleton from '@/components/Skeleton'
import ToolRunner from '@/components/ToolRunner'
import { useState } from 'react'
import { HistoryList } from '@/components/HistoryList'

export const dynamic = 'force-dynamic';

export default function Page() {
  const { messages, addMsg, plan, setPlan, decision, setDecision, recs, setRecs, loading, setLoading, reset, openRunner, setController } = useChat()
  const [firstRun, setFirstRun] = useState(true)
  const [lastGoal, setLastGoal] = useState('')

  async function onSend(text: string) {
    setLoading(true)
    setFirstRun(false)
    setLastGoal(text)
    setRecs([])               // clear old recs for a fresh progressive render
    setDecision(undefined)    // clear decision banner
    addMsg({ id: crypto.randomUUID(), role: 'user', text })

    const controller = new AbortController()
    setController(controller)
    try {
      // 1) Fetch plan first (progressively renders banner + steps)
      const p = await apiPlan(text, { preferences: ['free tools only'] }, { signal: controller.signal, timeoutMs: 15000 })
      setPlan(p.plan || [])
      setDecision(p.decision)
      addMsg({ id: crypto.randomUUID(), role: 'assistant', text: p.decision?.summary || 'Drafted a plan.' })

      // 2) Fetch recommendations then release one-by-one
      const r = await apiRecommend(text, p.plan, { optimize: 'balanced' }, { signal: controller.signal, timeoutMs: 15000 })
      const list = r.recommendations || []
      for (const item of list) {
        // append one recommendation at a time with a small delay for UX
        setRecs(prev => [...prev, item])
        await new Promise(res => setTimeout(res, 200))
      }
    } catch (e: any) {
      const aborted = e?.name === 'AbortError' || /timed out/i.test(String(e.message))
      addMsg({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: aborted ? 'Stopped. You can refine your prompt and run again.' : ('Error: ' + e.message)
      })
    } finally {
      setLoading(false)
      setController(undefined)
    }
  }

  return (
    <div className="container py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      <div className="space-y-4">
        <PromptBar onSend={onSend} loading={loading} />
        <div className="space-y-3">
          {messages.map(m => <MessageBubble key={m.id} role={m.role} text={m.text} />)}
          {loading && messages.filter(m=>m.role==='assistant').length===0 ? (
            <MessageBubble role="assistant" typing text="" />
          ) : null}
        </div>

        {loading && !decision ? <Skeleton className="h-16" /> : decision ? (
          <DecisionBanner summary={decision.summary} estimates={decision.estimates} />
        ) : null}

        <div className="space-y-3">
          {loading && plan.length===0 ? <Skeleton className="h-28" /> : null}
          {recs.map((r:any)=>(
            <Toolcard
              key={`${r.toolId}-${r.title}`}
              title={`${r.title}`}
              why={r.why}
              pricing={r?.badges?.pricing || 'free'}
              estimates={r.estimates}
              onRun={() => openRunner({ toolId: r.toolId, goal: lastGoal, plan })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading && plan.length===0 ? <Skeleton className="h-48" /> : <PlanPanel plan={plan} />}
        <div className="card p-4">
          <div className="font-semibold mb-2">Estimates</div>
          {decision?.estimates ? (
            <div className="text-sm">
              <div>Cost: Ã¢"šÂ¹ {Math.round(decision.estimates.costINR)}</div>
              <div>ETA: {decision.estimates.minutes} minutes</div>
              <div>Steps: {decision.estimates.steps}</div>
            </div>
          ) : <div className="text-muted text-sm">{firstRun ? 'Run a goal to see estimates.' : 'No estimates yet.'}</div>}
        </div>
        <HistoryList onRerun={(goal) => onSend(goal)} />

        <button className="btn w-full" onClick={()=>reset()}>Reset</button>
        <div className="text-xs text-muted">API: {process.env.NEXT_PUBLIC_CORE_API_BASE || 'not set'}</div>
      </div>

      <ToolRunner />
    </div>
  )
}


