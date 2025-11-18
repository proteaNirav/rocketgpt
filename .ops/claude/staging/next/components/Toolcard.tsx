import EstimateBadge from './EstimateBadge'

export default function Toolcard({ title, why, pricing, estimates, onRun } : any) {
  return (
    <div className="card p-4 flex items-start justify-between gap-4 transition-transform hover:-translate-y-0.5">
      <div>
        <div className="font-semibold text-lg">{title}</div>
        <div className="text-sm text-muted mt-1">{why}</div>
        <div className="mt-3"><EstimateBadge {...(estimates||{})} /></div>
        <div className="text-xs mt-2 opacity-70">Pricing: {pricing}</div>
      </div>
      <button className="btn h-10 px-4" onClick={onRun}>Run</button>
    </div>
  )
}


