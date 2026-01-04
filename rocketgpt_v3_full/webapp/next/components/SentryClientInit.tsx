'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Minimal, explicit client-side init + expose on window
export default function SentryClientInit() {
  const safe =
    (process.env.NEXT_PUBLIC_RGPT_SAFE_MODE ?? process.env.NEXT_PUBLIC_SAFE_MODE ?? '')
      .toString()
      .toLowerCase()

  const isSafe =
    safe === '1' || safe === 'true' || safe === 'on' || safe === 'safe' || safe === 'safemode'

  useEffect(() => {
    if (isSafe) return

    // avoid double init on fast refresh
    const w = window as any
    if (w.__sentry_inited) return

    try {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
        tracesSampleRate: 0.15,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || 'production',
        enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      })

      w.Sentry = Sentry // <-- makes window.Sentry available in DevTools
      w.__sentry_inited = true
    } catch {
      // never crash UI due to telemetry
    }
  }, [isSafe])

  return null
}
