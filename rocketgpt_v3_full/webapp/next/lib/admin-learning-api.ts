export type LearningItemStatus =
  | 'proposed'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'revoked'
  | 'deprecated'
export type LearningSourceKind = 'rss' | 'chat'

export type LearningItemDto = {
  id: string
  title: string
  status: LearningItemStatus
  sourceKind: LearningSourceKind
  sourceRef: string | null
  createdAt: string
  topics: string[]
  libraryPath: string | null
  sanitizedContent: string
}

export type LearningSourceDto = {
  id: string
  kind: LearningSourceKind
  name: string
  sourceUrl: string | null
  enabled: boolean
  intervalMinutes: number
  lastRunAt: string | null
  lastError: string | null
}

function baseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'content-type': 'application/json',
    ...(extra || {}),
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers: {
      ...baseHeaders(),
      ...(init?.headers || {}),
    },
  })
  const text = await response.text()
  let body: any = {}
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { detail: text }
    }
  }
  if (!response.ok) {
    throw new Error(body?.error || body?.detail || response.statusText)
  }
  return body as T
}

export async function listLearningItems(status?: LearningItemStatus): Promise<LearningItemDto[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  const data = await requestJson<any>(`/api/_admin/learning/items${query}`)
  return (data.items || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    sourceKind: row.source_kind,
    sourceRef: row.source_ref ?? null,
    createdAt: row.created_at,
    topics: row.topics || [],
    libraryPath: row.libraryPath ?? null,
    sanitizedContent: row.sanitized_content ?? '',
  }))
}

export async function getLearningItem(itemId: string): Promise<LearningItemDto> {
  const rows = await listLearningItems()
  const row = rows.find((x) => x.id === itemId)
  if (!row) throw new Error('Item not found.')
  return row
}

export async function reviewLearningItem(
  itemId: string,
  decision: 'approve' | 'reject' | 'revoke' | 'deprecate',
  rationale?: string,
): Promise<void> {
  await requestJson(`/api/_admin/learning/items/${encodeURIComponent(itemId)}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision, rationale }),
  })
}

export async function publishLearningItem(
  itemId: string,
  libraryId: string,
): Promise<{ filePath: string }> {
  return requestJson(`/api/_admin/learning/items/${encodeURIComponent(itemId)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ libraryId }),
  })
}

export async function listLearningSources(): Promise<LearningSourceDto[]> {
  const data = await requestJson<any>('/api/_admin/learning/sources')
  return (data.items || []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    sourceUrl: row.source_url ?? null,
    enabled: !!row.enabled,
    intervalMinutes: Number(row.interval_minutes ?? 360),
    lastRunAt: row.last_run_at ?? null,
    lastError: row.last_error ?? null,
  }))
}

export async function createLearningSource(input: {
  kind: LearningSourceKind
  name: string
  sourceUrl?: string | null
  enabled?: boolean
  intervalMinutes?: number
}): Promise<void> {
  await requestJson('/api/_admin/learning/sources', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLearningSource(
  sourceId: string,
  patch: {
    name?: string
    sourceUrl?: string | null
    enabled?: boolean
    intervalMinutes?: number
  },
): Promise<void> {
  await requestJson(`/api/_admin/learning/sources/${encodeURIComponent(sourceId)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export async function runLearningSource(sourceId: string): Promise<void> {
  await requestJson(`/api/_admin/learning/sources/${encodeURIComponent(sourceId)}/run`, {
    method: 'POST',
  })
}
