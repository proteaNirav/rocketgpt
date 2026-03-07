import { CatCatalogItem } from '@/lib/cats-seed'

export const DYNAMIC_CATS_KEY = 'rgpt.cats.dynamic.v1'
const LEGACY_DYNAMIC_CATS_KEY = 'rgpt_dynamic_cats_v1'

type SideEffect = CatCatalogItem['allowed_side_effects'][number]

export type DynamicCatStatus = CatCatalogItem['status'] | 'development_pending'

export type DynamicCatItem = {
  cat_id: string
  canonical_name: string
  name: string
  purpose: string
  version: string
  status: DynamicCatStatus
  owner?: CatCatalogItem['owner']
  requires_approval: boolean
  passport_required: boolean
  allowed_side_effects: SideEffect[]
  tags: string[]
  last_updated: string
  source: 'dynamic'
}

function normalizeDynamicCat(candidate: unknown): DynamicCatItem | null {
  if (!candidate || typeof candidate !== 'object') return null
  const item = candidate as Partial<DynamicCatItem>
  if (!item.cat_id || !item.name || !item.canonical_name) return null

  const safeEffects: SideEffect[] = Array.isArray(item.allowed_side_effects)
    ? item.allowed_side_effects.filter(
        (effect): effect is SideEffect =>
          effect === 'none' ||
          effect === 'read_only' ||
          effect === 'ledger_write' ||
          effect === 'workflow_dispatch',
      )
    : ['read_only']

  return {
    cat_id: item.cat_id,
    canonical_name: item.canonical_name,
    name: item.name,
    purpose: item.purpose || '',
    version: item.version || '0.1.0',
    status: item.status || 'development_pending',
    owner: item.owner || 'user',
    requires_approval: Boolean(item.requires_approval),
    passport_required: Boolean(item.passport_required),
    allowed_side_effects: safeEffects.length ? safeEffects : ['read_only'],
    tags: Array.from(new Set([...(item.tags || []), 'dynamic', 'development_pending'])),
    last_updated: item.last_updated || new Date().toISOString(),
    source: 'dynamic',
  }
}

export function loadDynamicCats(): DynamicCatItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw =
      window.localStorage.getItem(DYNAMIC_CATS_KEY) ||
      window.localStorage.getItem(LEGACY_DYNAMIC_CATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((entry) => normalizeDynamicCat(entry))
      .filter((entry): entry is DynamicCatItem => entry !== null)
  } catch {
    return []
  }
}

export function saveDynamicCats(items: DynamicCatItem[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DYNAMIC_CATS_KEY, JSON.stringify(items))
}

export function saveDynamicCat(item: DynamicCatItem): DynamicCatItem {
  const normalized = normalizeDynamicCat(item)
  if (!normalized) {
    throw new Error('Invalid dynamic CAT payload.')
  }

  const current = loadDynamicCats()
  const index = current.findIndex((entry) => entry.cat_id === normalized.cat_id)
  const next =
    index >= 0
      ? [...current.slice(0, index), normalized, ...current.slice(index + 1)]
      : [normalized, ...current]
  saveDynamicCats(next)
  return normalized
}

export function updateDynamicCat(item: DynamicCatItem): DynamicCatItem {
  return saveDynamicCat(item)
}

export function deleteDynamicCat(catId: string): void {
  const next = loadDynamicCats().filter((entry) => entry.cat_id !== catId)
  saveDynamicCats(next)
}

export function clearDynamicCats(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DYNAMIC_CATS_KEY)
}

export function upsertDynamicCat(item: DynamicCatItem): void {
  saveDynamicCat(item)
}

export function makeDevPendingCat(input: {
  name: string
  purpose: string
  canonical_name?: string
  tags?: string[]
  allowed_side_effects?: SideEffect[]
}): DynamicCatItem {
  const safeName = (input.name || 'Dynamic CAT').trim()
  const slug =
    safeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dynamic-cat'

  return {
    cat_id: `RGPT-DYN-${Date.now().toString(36).toUpperCase()}`,
    canonical_name: input.canonical_name || `cats/dynamic/${slug}`,
    name: safeName,
    purpose: (input.purpose || 'Development pending CAT').trim(),
    version: '0.1.0',
    status: 'development_pending',
    owner: 'user',
    requires_approval: true,
    passport_required: true,
    allowed_side_effects: input.allowed_side_effects?.length
      ? input.allowed_side_effects
      : ['read_only'],
    tags: Array.from(new Set([...(input.tags || []), 'dynamic', 'development_pending'])),
    last_updated: new Date().toISOString(),
    source: 'dynamic',
  }
}
