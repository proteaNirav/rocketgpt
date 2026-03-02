/* =========================================================
 * RGPT-S4 Ã¢â‚¬â€ Runtime Guard (Decision Ledger Enforcement)
 * FAIL-CLOSED BY DESIGN
 * ========================================================= */
import { loadDecisionById, verifyDecision } from '../ledger/decision-ledger'
import { getExpectedPolicySnapshotHash } from '../policy/policy-snapshot'

export interface RuntimeDecisionContext {
  decision_id: string
}

export async function enforceRuntimeDecision(ctx: RuntimeDecisionContext): Promise<void> {
  // DEV BYPASS (explicitly gated):
  // Allows local probing with decision ids like dev-probe-* ONLY when RGPT_ALLOW_DEV_DECISIONS=1
  if (process.env.RGPT_ALLOW_DEV_DECISIONS === '1') {
    const isDev = process.env.NODE_ENV !== 'production'
    const did = (ctx?.decision_id ?? '').trim()
    const isDevProbe = did.startsWith('dev-probe-')
    if (isDev && isDevProbe) {
      return // treat as allowed in local/dev only
    }
  }

  if (!ctx || !ctx.decision_id) {
    throw new Error('RGPT_GUARD_BLOCK: MISSING_DECISION_ID')
  }

  const expectedPolicyHash = getExpectedPolicySnapshotHash()
  if (!expectedPolicyHash) {
    throw new Error('RGPT_GUARD_BLOCK: MISSING_POLICY_SNAPSHOT_HASH')
  }

  const decision = await loadDecisionById(ctx.decision_id)
  const result = verifyDecision(decision, expectedPolicyHash)

  if (!result.ok) {
    throw new Error(`RGPT_GUARD_BLOCK: ${(result as any).error ?? (result as any).reason}`)
  }

  // Decision is approved and valid Ã¢â‚¬â€ execution may proceed
}

/**
 * Compatibility wrapper for API route handlers that call `runtimeGuard(req, { permission: "..." })`.
 * FAIL-CLOSED: requires x-rgpt-decision-id (or body.decision_id when JSON), then enforces decision.
 */
export async function runtimeGuard(req: Request, _opts?: any): Promise<void> {
  const headerId =
    (req as any)?.headers?.get?.('x-rgpt-decision-id') ??
    (req as any)?.headers?.get?.('X-RGPT-Decision-Id') ??
    ''

  let bodyId = ''
  try {
    // Some callers send decision_id in JSON body; keep it best-effort.
    const cloned = (req as any)?.clone?.() ?? null
    if (cloned) {
      const j = await cloned.json().catch(() => ({}) as any)
      bodyId = (j?.decision_id ?? '') as string
    }
  } catch {}

  const decision_id = (headerId || bodyId || '').trim()
  if (!decision_id) {
    const err: any = new Error('MISSING_DECISION_ID')
    err.status = 400
    throw err
  }

  await enforceRuntimeDecision({ decision_id })
}
