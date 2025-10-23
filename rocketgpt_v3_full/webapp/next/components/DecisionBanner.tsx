import EstimateBadge from './EstimateBadge'

export default function DecisionBanner({ summary, estimates }: any) {
  return (
    <div className="card p-4 border-2 border-accent">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{summary}</div>
        <EstimateBadge {...(estimates||{})} />
      </div>
    </div>
  )
}
