import { NextResponse } from 'next/server'

export interface OrchestratorRouteContext {
  route: string
  runId?: string
}

interface SafeModeErrorPayload {
  success: boolean
  error_code: string
  message: string
  capability?: string
  safe_mode?: boolean
  timestamp?: string
  details?: any
  status?: number
}

/**
 * Type guard to detect Safe-Mode errors thrown by safeModeGuard().
 */
function isSafeModeError(err: unknown): err is SafeModeErrorPayload {
  if (!err || typeof err !== 'object') return false
  const anyErr = err as any
  return (
    anyErr.error_code === 'SAFE_MODE_ACTIVE' ||
    (anyErr.safe_mode === true && typeof anyErr.message === 'string')
  )
}

/**
 * Normalize unknown error objects into a safe JSON payload.
 */
export function normalizeError(err: unknown): { message: string; name?: string } {
  if (err instanceof Error) {
    return {
      message: err.message || 'Unexpected error',
      name: err.name,
    }
  }

  if (typeof err === 'string') {
    return {
      message: err,
    }
  }

  try {
    const asJson = JSON.stringify(err)
    return {
      message: asJson,
    }
  } catch {
    return {
      message: 'Unexpected error',
    }
  }
}

/**
 * Wrap a route handler with standardized error logging and response.
 */
export async function withOrchestratorHandler(
  ctx: OrchestratorRouteContext,
  handler: () => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  try {
    return await handler()
  } catch (err) {
    // 1) Safe-Mode specific handling – return the error object as-is
    if (isSafeModeError(err)) {
      const safeErr = err as SafeModeErrorPayload

      const statusCode =
        typeof safeErr.status === 'number' && safeErr.status >= 400 ? safeErr.status : 503

      console.warn('[ORCH-ROUTE-SAFEMODE]', {
        route: ctx.route,
        runId: ctx.runId,
        error: safeErr,
      })

      return NextResponse.json(safeErr, { status: statusCode })
    }

    // 2) Generic error handling (existing behaviour)
    const errorPayload = normalizeError(err)

    // Server-side log for observability
    console.error(
      '[ORCH-ROUTE-ERROR]',
      {
        route: ctx.route,
        runId: ctx.runId,
        error: errorPayload,
      },
      err,
    )

    return NextResponse.json(
      {
        success: false,
        error: errorPayload,
        route: ctx.route,
        runId: ctx.runId ?? null,
      },
      { status: 403 },
    )
  }
}
