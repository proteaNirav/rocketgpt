export default function MessageBubble({ role, text }: any) {
  const mine = role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] card p-3 ${mine ? 'bg-[#0f1420]' : ''}`}>
        <div className="text-sm opacity-70">{mine ? 'You' : 'RocketGPT'}</div>
        <div className="mt-1 whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}
