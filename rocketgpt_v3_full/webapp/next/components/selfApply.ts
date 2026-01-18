// components/selfApply.ts
import { getSupabase } from '../lib/supabase'

/**
 * Ã¢Å“... Step 1 Ã¢â‚¬" Mark manual review as PASSED via RPC
 * Calls the pass_manual_review(p_job_id, p_actor) function in Supabase.
 */
export async function passManualReview(jobId: string, actor = 'superuser') {
  const sb = getSupabase()
  const { data, error } = await sb.rpc('pass_manual_review', {
    p_job_id: jobId,
    p_actor: actor,
  })
  if (error) throw new Error(error.message || 'Supabase RPC error')
  return data
}

/**
 * Ã¢Å“... Step 2 Ã¢â‚¬" Invoke the Edge Function for Self-Apply (DIRECT mode)
 * After manual review is passed, this triggers the next step of apply automatically.
 */
export async function runSelfApplyDirect(proposalId: string, idempotencyKey?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase URL or Anon key missing in environment variables')
  }

  const endpoint = `${supabaseUrl}/functions/v1/bright-function?mode=direct`
  const payload = {
    proposal_id: proposalId,
    idempotency_key: idempotencyKey ?? `proposal:${proposalId}:ui`,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Edge call failed (${res.status}): ${text || res.statusText}`)
  }

  return res.json()
}

/**
 * Ã¢Å“... Step 3 Ã¢â‚¬" (Optional helper)
 * If you want to chain both steps together after a manual review pass:
 * 1) passManualReview(jobId)
 * 2) runSelfApplyDirect(proposalId)
 */
export async function completeManualReviewAndApply(
  jobId: string,
  proposalId: string,
  actor = 'superuser',
) {
  await passManualReview(jobId, actor)
  const result = await runSelfApplyDirect(proposalId)
  return result
}
