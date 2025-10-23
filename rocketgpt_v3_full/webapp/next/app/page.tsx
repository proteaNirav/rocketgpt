'use client'
import { useChat } from '@/lib/store'
import { plan as apiPlan, recommend as apiRecommend } from '@/lib/api'
import PromptBar from '@/components/PromptBar'
import MessageBubble from '@/components/MessageBubble'
import Toolcard from '@/components/Toolcard'
import DecisionBanner from '@/components/DecisionBanner'
import PlanPanel from '@/components/PlanPanel'
import { useState } from 'react'

export default function Page() {
  const { messages, addMsg, plan, setPlan, decision, setDecision, recs, setRecs, loading, setLoading, reset } = useChat()
  const [lastGoal, setLastGoal] = useState<string>('')

  async function onSend(text: string) {
    setLoading(true)
    try {
      addMsg({ id: crypto.randomUUID(), role: 'user', text })
      setLastGoal(text)
      const p = await apiPlan(text, { preferences: ['free tools only'] })
      setPlan(p.plan || [])
      setDecision(p.decision)
      const r = await apiRecommend(text, p.plan, { optimize: 'balanced' })
      setRecs(r.recommendations || [])
      addMsg({ id: crypto.randomUUID(), role: 'assistant', text: p.decision?.summary || 'Drafted a plan.' })
    } catch (e: any) {
      addMsg({ id: crypto.randomUUID(), role: 'assistant', text: 'Error: ' + e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
      {/* Left: Chat Stream */}
      <div className="space-y-4">
        <PromptBar onSend={onSend} loading={loading} />
        <div className="space-y-3">
          {messages.map(m => <MessageBubble key={m.id} role={m.role} text={m.text} />)}
        </div>

        {decision ? <DecisionBanner summary={decision.summary} estimates={decision.estimates} /> : null}

        {/* Recommendations */}
        <div className="space-y-3">
          {recs.map((r:any)=>(
            <Toolcard
              key={r.toolId}
              title={`${r.title}`}
              why={r.why}
              pricing={r?.badges?.pricing || 'free'}
              estimates={r.estimates}
              cta={()=> alert(`Run template with ${r.toolId} (demo)`)} />
          ))}
        </div>
      </div>

      {/* Right: Assist Panel */}
      <div className="space-y-4">
        <PlanPanel plan={plan} />
        <div className="card p-4">
          <div className="font-semibold mb-2">Estimates</div>
          {decision?.estimates ? (
            <div className="text-sm">
              <div>Cost: ₹ {Math.round(decision.estimates.costINR)}</div>
              <div>ETA: {decision.estimates.minutes} minutes</div>
              <div>Steps: {decision.estimates.steps}</div>
            </div>
          ): <div className="text-muted text-sm">Run a goal to see estimates.</div>}
        </div>
        <button className="btn w-full" onClick={()=>reset()}>Reset</button>
        <div className="text-xs text-muted">API: {process.env.NEXT_PUBLIC_CORE_API_BASE || 'not set'}</div>
      </div>
    </div>
  )
}
