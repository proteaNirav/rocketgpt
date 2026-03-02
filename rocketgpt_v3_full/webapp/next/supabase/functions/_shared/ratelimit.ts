// deno-lint-ignore-file no-explicit-any
import { supabaseAdmin } from './supabaseAdminClient.ts'

export type RLCheckResult = {
  allowed: boolean
  minute_remaining: number
  hour_remaining: number
  retry_after_seconds: number
  reason: string
}

export async function checkRateLimit(userId: string, endpoint: string): Promise<RLCheckResult> {
  const { data, error } = await supabaseAdmin.rpc('rl_check_and_increment', {
    p_user_id: userId,
    p_endpoint: endpoint,
  })

  if (error) {
    // If the RL function errors, fail safe (block) with a short retry
    return {
      allowed: false,
      minute_remaining: 0,
      hour_remaining: 0,
      retry_after_seconds: 10,
      reason: `rpc_error:${error.message}`,
    }
  }

  // data is jsonb -> already an object
  return data as RLCheckResult
}
