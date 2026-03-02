import 'server-only'

/**
 * RGPT Runtime Ledger (Canonical)
 * - Append-only tables: rgpt.runtime_executions, rgpt.runtime_decisions
 * - Idempotency enforced via unique(idempotency_key)
 *
 * IMPORTANT:
 * - Never store secrets/raw tokens in ledger fields.
 * - Prefer hashing or blob refs for inputs.
 */

export type ActorType = 'human' | 'ci' | 'agent' | 'system'
export type RuntimeMode = 'normal' | 'safe_mode' | 'dry_run' | 'read_only'
export type ExecutionStatus = 'started' | 'succeeded' | 'failed' | 'aborted' | 'blocked'

export type DecisionType = 'allow' | 'deny' | 'escalate' | 'auto_fix' | 'noop'
export type DecisionScope = 'security' | 'workflow' | 'data' | 'runtime' | 'quality'
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface ExecutionInsert {
  idempotency_key: string
  request_id: string
  run_id?: string | null

  parent_execution_id?: string | null
  root_execution_id: string

  actor_type: ActorType
  actor_id: string
  actor_display?: string | null

  runtime_mode: RuntimeMode
  runtime_policy_version?: string | null
  safe_mode_reason_code?: string | null
  permissions_snapshot?: unknown | null

  component: string
  operation: string
  target_ref?: string | null

  inputs_ref?: string | null
  inputs_hash?: string | null

  started_at?: string // ISO
  ended_at?: string | null // ISO
  status?: ExecutionStatus

  error_kind?: string | null
  error_message?: string | null

  metrics?: unknown | null
  created_by?: string
  ledger_version?: number
}

export interface DecisionInsert {
  execution_id: string
  decision_seq: number
  idempotency_key: string

  decision_type: DecisionType
  decision_scope: DecisionScope
  confidence?: number | null
  severity?: Severity

  reason_code: string
  reason_text: string

  policy_refs?: unknown | null
  evidence_refs?: unknown | null

  recommended_action?: string | null
  patch_ref?: string | null
  requires_approval?: boolean

  created_by?: string
  ledger_version?: number
}

type SupabaseServerClient = {
  schema: (s: string) => SupabaseServerClient
  from: (t: string) => {
    upsert: (values: any, opts?: any) => any
    select: (cols?: string) => any
  }
}

/**
 * Provide your existing Supabase server client here.
 * We import lazily to avoid guessing your exact file path until Step 13 wiring.
 */
async function getServerClient(): Promise<SupabaseServerClient> {
  // NOTE: Adjust this import path to your actual server client module when wiring in Step 13.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../supabase/server')
  if (!mod?.createClient) throw new Error('Missing createClient() in src/rgpt/supabase/server')
  return mod.createClient()
}

/**
 * Idempotent insert for Execution.
 * Uses upsert on unique(idempotency_key) and returns the existing/new execution_id.
 */
export async function ledgerUpsertExecution(
  input: ExecutionInsert,
): Promise<{ execution_id: string }> {
  const sb = await getServerClient()

  const payload = {
    status: 'started',
    created_by: 'server',
    ledger_version: 1,
    ...input,
  }

  // onConflict ensures idempotency
  const { data, error } = await sb
    .schema('rgpt')
    .from('runtime_executions')
    .upsert(payload, { onConflict: 'idempotency_key' })
    .select('execution_id')
    .single()

  if (error) throw error
  return { execution_id: data.execution_id as string }
}

/**
 * Idempotent insert for Decision.
 * Uses upsert on unique(idempotency_key).
 */
export async function ledgerUpsertDecision(input: DecisionInsert): Promise<void> {
  const sb = await getServerClient()

  const payload = {
    severity: 'info',
    requires_approval: false,
    created_by: 'server',
    ledger_version: 1,
    ...input,
  }

  const { error } = await sb
    .schema('rgpt')
    .from('runtime_decisions')
    .upsert(payload, { onConflict: 'idempotency_key' })

  if (error) throw error
}
