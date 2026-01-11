type Props = { costINR?: number; minutes?: number; steps?: number }

export default function EstimateBadge({ costINR = 0, minutes = 0, steps = 0 }: Props) {
  return (
    <div className="flex gap-2">
      <span className="badge">&nbsp;₹ {Math.round(costINR)}</span>
      <span className="badge">⏱️ {minutes} min</span>
      <span className="badge">🧩 {steps} steps</span>
    </div>
  )
}
