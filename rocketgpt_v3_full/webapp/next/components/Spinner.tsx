export default function Spinner({ size=16 }: { size?: number }) {
  const s = `${size}px`
  return (
    <svg className="animate-spin text-ink/70" width={s} height={s} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity=".2"/>
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none"/>
    </svg>
  )
}
