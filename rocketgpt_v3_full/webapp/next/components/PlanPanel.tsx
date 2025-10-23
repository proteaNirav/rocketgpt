export default function PlanPanel({ plan }: any) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-2">Plan</div>
      <ol className="list-decimal pl-5 space-y-1">
        {plan?.map((s:any)=> (
          <li key={s.id}>
            <span className="font-medium">{s.title}</span>
            {s.detail ? <span className="text-muted"> — {s.detail}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
