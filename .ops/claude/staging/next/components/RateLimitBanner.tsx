// components/RateLimitBanner.tsx
'use client'

import { useEffect, useState } from 'react'
import { onRateLimited } from '@/lib/ratelimitBus'

export default function RateLimitBanner() {
  const [visible, setVisible] = useState(false)
  const [eta, setEta] = useState<number>(0)
  const [plan, setPlan] = useState<string>('')

  useEffect(() => {
    // Register listener for rate limit events
    const unsubscribe = onRateLimited(({ message, retryAfter, plan }) => {
      setVisible(true)
      setEta(retryAfter ?? 60)
      setPlan(plan ?? '')
      console.warn(message || 'Rate limit reached')
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
      <b>Rate limit reached.</b>{' '}
      {eta > 0 && <>Please retry in {eta} seconds.</>} {' '}
      {plan && <span className="ml-1">(Your plan: {plan})</span>}
    </div>
  )
}
