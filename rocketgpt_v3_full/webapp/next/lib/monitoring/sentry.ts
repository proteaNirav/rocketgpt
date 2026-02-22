import * as Sentry from '@sentry/nextjs'

export function captureError(err: unknown, context?: Record<string, any>) {
  if (context) Sentry.setContext('extra', context)
  Sentry.captureException(err)
}

export function setUser(id?: string | null, email?: string | null) {
  Sentry.setUser(id || email ? { id: id || undefined, email: email || undefined } : null)
}
