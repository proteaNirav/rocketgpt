import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
  tracesSampleRate: 0.15,         // perf sampling (client)
  replaysSessionSampleRate: 0.1,  // session replay (optional; can be 0)
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  enabled: !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
})
// Ã¢Â¬"¡Ã¯Â¸Â add this so you can call it from DevTools
;(globalThis as any).Sentry = Sentry


