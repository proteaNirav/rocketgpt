// supabase/functions/quick-responder/_shared/ratelimit.ts
import { sbAdmin } from './supabaseAdminClient.ts'

type Limits = { per_minute: number; per_hour: number }
const PLAN_LIMITS: Record<string, Limits> = {
  FREE: { per_minute: 5, per_hour: 100 },
  PRO: { per_minute: 30, per_hour: 1000 },
  ENTERPRISE: { per_minute: 120, per_hour: 5000 },
}

export async function checkRateLimit(user_id: string, endpoint: string) {
  // 1) Find user's plan (default FREE)
  let plan = 'FREE'
  const { data: planRow } = await sbAdmin
    .from('rl_user_plans')
    .select('plan_code')
    .eq('user_id', user_id)
    .maybeSingle()

  if (planRow?.plan_code) plan = planRow.plan_code

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  // 2) Count hits in last minute and hour
  const isoMin = new Date(Date.now() - 60_000).toISOString()
  const isoHour = new Date(Date.now() - 3_600_000).toISOString()

  const [minRes, hourRes] = await Promise.all([
    sbAdmin
      .from('rl_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('endpoint', endpoint)
      .gte('created_at', isoMin),
    sbAdmin
      .from('rl_events')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('endpoint', endpoint)
      .gte('created_at', isoHour),
  ])

  const minuteCount = minRes.count ?? 0
  const hourCount = hourRes.count ?? 0

  const minuteRemaining = Math.max(0, limits.per_minute - minuteCount)
  const hourRemaining = Math.max(0, limits.per_hour - hourCount)

  const allowed = minuteRemaining > 0 && hourRemaining > 0
  const reason = allowed ? null : 'rate_limited'

  // 3) Log the event
  await sbAdmin.from('rl_events').insert({
    user_id,
    endpoint,
    allowed,
    reason,
  })

  // 4) Return structured info
  return {
    allowed,
    reason,
    minute_remaining: minuteRemaining,
    hour_remaining: hourRemaining,
    retry_after_seconds: allowed ? 0 : 60,
  }
}
