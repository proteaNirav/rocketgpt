// rocketgpt_v3_full/webapp/next/lib/obs.ts
// Minimal observation logger (UI-side) Ã¢â‚¬" safe, non-blocking.

import { supabase } from '@/lib/supabaseClient'

export async function logObservation(input: {
  source: 'ui' | 'api' | 'runner'
  event_type: string
  success?: boolean
  latency_ms?: number
  session_id?: string
  user_role?: 'user' | 'superuser' | 'system'
  detail?: Record<string, any>
}) {
  try {
    const payload = {
      source: input.source,
      event_type: input.event_type,
      success: input.success ?? null,
      latency_ms: input.latency_ms ?? null,
      session_id: input.session_id ?? null,
      user_role: input.user_role ?? null,
      detail: input.detail ?? null,
      // created_by is auto-filled by trigger if user is signed in
    }
    const { error } = await supabase.from('self_observations').insert(payload)
    if (error) console.warn('[obs] insert failed:', error.message)
  } catch (e: any) {
    console.warn('[obs] unexpected error:', e?.message || e)
  }
}


