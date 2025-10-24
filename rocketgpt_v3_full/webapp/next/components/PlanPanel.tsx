export default function PlanPanel({ plan }: any) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Plan</div>
      <ol className="space-y-2">
        {plan?.map((s:any, i:number)=> (
          <li key={s.id} className="flex gap-3 items-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border text-xs opacity-80">{i+1}</span>
            <div>
              <div className="font-medium">{s.title}</div>
              {s.detail ? <div className="text-muted text-sm mt-0.5">{s.detail}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
