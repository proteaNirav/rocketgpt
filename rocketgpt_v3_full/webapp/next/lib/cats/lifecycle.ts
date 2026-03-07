import type { CatsStatus } from '@/lib/db/catsRepo'

export const ALLOWED_EDIT_STATUSES = new Set<CatsStatus>(['draft', 'review'])
export const ALLOWED_PUBLISH_CAT_STATUSES = new Set<CatsStatus>(['draft', 'approved'])

export const TRANSITION_MATRIX: Record<CatsStatus, CatsStatus[]> = {
  draft: ['review'],
  review: ['approved', 'draft'],
  approved: ['active', 'draft'],
  active: ['deprecated', 'revoked'],
  deprecated: ['revoked'],
  revoked: [],
}

export const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z-.]+)?$/

export function canTransition(fromStatus: CatsStatus, toStatus: CatsStatus): boolean {
  return TRANSITION_MATRIX[fromStatus].includes(toStatus)
}
