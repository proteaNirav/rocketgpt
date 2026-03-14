import TypingDots from './TypingDots'

export default function MessageBubble({ role, text, typing = false }: any) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] card p-3 ${mine ? 'bg-[#0f1420]' : ''}`}>
        <div className="text-xs uppercase tracking-wide opacity-60">
          {mine ? 'You' : 'RocketGPT'}
        </div>
        <div className="mt-1 whitespace-pre-wrap leading-relaxed">
          {typing ? <TypingDots /> : text}
        </div>
      </div>
    </div>
  )
}
