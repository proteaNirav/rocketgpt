import EstimateBadge from './EstimateBadge'

export default function Toolcard({ title, why, pricing, estimates, cta } : any) {
  return (
    <div className="card p-4 flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted mt-1">{why}</div>
        <div className="mt-2"><EstimateBadge {...(estimates||{})} /></div>
        <div className="text-xs mt-2 opacity-70">Pricing: {pricing}</div>
      </div>
      <button className="btn" onClick={cta}>Run</button>
    </div>
  )
}
