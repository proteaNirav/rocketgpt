import { emitRateLimited } from './ratelimitBus'
import { isRateLimitError } from './errors'

/**
 * Wrap any promise that might throw RateLimitError and emit the banner automatically.
 */
export async function callWithRateLimit<T>(fn: () => Promise<T>, context: string): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    if (isRateLimitError(e)) {
      emitRateLimited({
        message: `Youâ€™ve hit your planâ€™s rate limit${context ? ` while ${context}` : ''}.`,
        retryAfter: e.retryAfter ?? e.rl?.retry_after_seconds,
        plan: e.rl?.limits?.plan_code,
      })
    }
    throw e // rethrow for upstream handling (UI messages, etc.)
  }
}
