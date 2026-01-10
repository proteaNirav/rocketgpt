type Listener = (payload: { message: string; retryAfter?: number; plan?: string }) => void
const listeners = new Set<Listener>()

export function onRateLimited(cb: Listener) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
export function emitRateLimited(payload: { message: string; retryAfter?: number; plan?: string }) {
  listeners.forEach((l) => l(payload))
}
