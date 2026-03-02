import type { ResolveInput, ResolveResult, RuntimeMode } from './runtime-mode.types'
import { loadRuntimeModeConfig, resolveRuntimeMode } from './runtime-mode.resolver'

/**
 * Server-side runtime mode resolution:
 * - ENV override: RGPT_RUNTIME_MODE
 * - Optional request headers:
 *     x-rgpt-requested-mode: OFFLINE|SAFE|SUPERVISED|AUTONOMOUS
 *     x-rgpt-explicit-confirm: true|false
 *
 * currentMode should typically come from your DB/ledger (later step).
 */
export function resolveRuntimeModeFromEnvAndHeaders(opts?: {
  headers?: Headers
  currentMode?: RuntimeMode
  triggers?: ResolveInput['triggers']
}): ResolveResult {
  const cfg = loadRuntimeModeConfig()

  const envModeRaw = process.env.RGPT_RUNTIME_MODE?.toUpperCase().trim()
  const envMode = (envModeRaw as RuntimeMode) || undefined

  const h = opts?.headers
  const requestedRaw = h?.get('x-rgpt-requested-mode')?.toUpperCase().trim()
  const requestedMode = (requestedRaw as RuntimeMode) || undefined

  const confirmRaw = h?.get('x-rgpt-explicit-confirm')?.toLowerCase().trim()
  const hasExplicitConfirmation =
    confirmRaw === 'true' || confirmRaw === '1' || confirmRaw === 'yes'

  const input: ResolveInput = {
    requestedMode,
    currentMode: opts?.currentMode,
    envMode,
    hasExplicitConfirmation,
    triggers: opts?.triggers,
  }

  return resolveRuntimeMode(input, cfg)
}
