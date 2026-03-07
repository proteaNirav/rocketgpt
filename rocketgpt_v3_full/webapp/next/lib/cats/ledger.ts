import { appendGovernanceLedgerEvent } from '@/lib/db/governanceRepo'

export async function recordCatsLedgerEvent(payload: Record<string, unknown>): Promise<void> {
  try {
    await appendGovernanceLedgerEvent({
      eventType: 'risk_eval',
      workflowId: 'cats.registry',
      runId: null,
      crpsId: null,
      payload,
    })
  } catch {
    // best-effort governance event for local/dev runs without Supabase governance schema
  }
}

export async function recordCatsTransitionLedgerEvent(
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await appendGovernanceLedgerEvent({
      eventType: 'containment_applied',
      workflowId: 'cats.registry',
      runId: null,
      crpsId: null,
      payload,
    })
  } catch {
    // best-effort governance event for local/dev runs without Supabase governance schema
  }
}
