type LogLevel = 'info' | 'warn' | 'error'

interface OrchTesterLogBase {
  component: 'orchestrator-tester-execute'
  ts: string // ISO timestamp
  level: LogLevel
  message: string
}

type OrchTesterLogPayload = OrchTesterLogBase & {
  /**
   * Optional correlation id / run id for tracing across layers.
   */
  run_id?: string

  /**
   * Profile id used for the tester run.
   */
  profile?: string | null

  /**
   * Optional request goal description.
   */
  goal?: string | null

  /**
   * HTTP status observed at the orchestrator level.
   */
  orchestrator_status_code?: number | null

  /**
   * HTTP status observed at the tester level.
   */
  tester_status_code?: number | null

  /**
   * Whether the tester reported success.
   */
  tester_success?: boolean | null

  /**
   * Arbitrary extra context.
   */
  context?: Record<string, unknown>
}

function writeOrchTesterLog(payload: OrchTesterLogPayload) {
  // Single-line JSON log for easy ingestion by log pipelines.
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload))
  } catch {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        component: 'orchestrator-tester-execute',
        ts: new Date().toISOString(),
        level: 'error',
        message: 'Failed to stringify orchestrator tester log payload',
      }),
    )
  }
}

function baseLog(
  level: LogLevel,
  message: string,
  partial: Partial<OrchTesterLogPayload>,
): OrchTesterLogPayload {
  return {
    component: 'orchestrator-tester-execute',
    ts: new Date().toISOString(),
    level,
    message,
    run_id: partial.run_id,
    profile: partial.profile ?? null,
    goal: partial.goal ?? null,
    orchestrator_status_code: partial.orchestrator_status_code ?? null,
    tester_status_code: partial.tester_status_code ?? null,
    tester_success: partial.tester_success ?? null,
    context: partial.context,
  }
}

export function logOrchTesterInfo(message: string, partial: Partial<OrchTesterLogPayload> = {}) {
  writeOrchTesterLog(baseLog('info', message, partial))
}

export function logOrchTesterError(message: string, partial: Partial<OrchTesterLogPayload> = {}) {
  writeOrchTesterLog(baseLog('error', message, partial))
}
