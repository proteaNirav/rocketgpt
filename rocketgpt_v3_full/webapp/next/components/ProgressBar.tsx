export default function ProgressBar({ value = 0 }: { value?: number }) {
  return (
    <div className="w-full h-2 bg-ink/10 rounded-xl overflow-hidden">
      <div
        className="h-full bg-accent"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}
