/**
 * Unified API error formatting utility for RocketGPT backend.
 * Ensures consistent error responses for all server-side routes.
 */

export function formatApiError(err: any) {
  const message = typeof err?.message === 'string' ? err.message : 'Unexpected server error'

  const errorName = err?.name || 'ServerError'

  return {
    success: false,
    error: errorName,
    message,
    stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  }
}
