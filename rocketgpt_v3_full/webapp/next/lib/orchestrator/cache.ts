let _cacheVersion = 0;

/**
 * Placeholder cache clear function for the Orchestrator.
 * In future, wire this to real in-memory / Redis / KV cache logic.
 */
export async function clearOrchestratorCache(): Promise<void> {
  _cacheVersion++;
}

