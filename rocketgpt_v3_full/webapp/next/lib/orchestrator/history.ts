/**
 * Minimal in-memory representation of an orchestrator run entry.
 * Replace with real persistence (DB / Supabase) later.
 */
export interface OrchestratorRunEntry {
  id: string
  created_at: string
  goal_title?: string | null
  status?: string | null
}

const inMemoryHistory: OrchestratorRunEntry[] = []

/**
 * Returns the last \limit\ run entries (newest first).
 */
export async function getRunHistory(limit: number): Promise<OrchestratorRunEntry[]> {
  const slice = inMemoryHistory.slice(-limit)
  return slice.reverse()
}
