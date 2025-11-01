import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.2, // perf sampling (server)
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  enabled: !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
})
