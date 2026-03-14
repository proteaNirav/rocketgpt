import { CatCatalogItem, SEED_CATS } from '@/lib/cats-seed'
import { DynamicCatItem, loadDynamicCats } from '@/lib/cats-dynamic'

function toCatalogStatus(status: DynamicCatItem['status']): CatCatalogItem['status'] {
  if (
    status === 'proposed' ||
    status === 'draft' ||
    status === 'approved' ||
    status === 'blocked' ||
    status === 'deprecated'
  ) {
    return status
  }
  return 'proposed'
}

function toCatalogItem(item: DynamicCatItem): CatCatalogItem {
  return {
    cat_id: item.cat_id,
    canonical_name: item.canonical_name,
    name: item.name,
    purpose: item.purpose,
    version: item.version,
    status: toCatalogStatus(item.status),
    owner: item.owner || 'user',
    requires_approval: item.requires_approval,
    passport_required: item.passport_required,
    allowed_side_effects: item.allowed_side_effects,
    tags: Array.from(new Set([...(item.tags || []), 'dynamic', 'development_pending'])),
    last_updated: item.last_updated,
  }
}

export function getCatsForUi(): CatCatalogItem[] {
  const dynamic = typeof window !== 'undefined' ? loadDynamicCats() : []
  return [...dynamic.map(toCatalogItem), ...SEED_CATS]
}
