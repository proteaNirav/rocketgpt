import {
  appendGovernanceLedgerEvent,
  getLastDigestGeneratedAt,
  insertWeeklyDigest,
  listContainmentEvents,
  listCrpsExecutions,
  upsertWeeklyPattern,
} from '@/lib/db/governanceRepo'
import { aggregateWeeklyDigest } from '@/lib/governance/digest-aggregate'

function weekRange(now = new Date()): { weekStart: string; weekEnd: string } {
  const end = new Date(now)
  end.setUTCHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 6)
  start.setUTCHours(0, 0, 0, 0)
  return { weekStart: start.toISOString(), weekEnd: end.toISOString() }
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return parsed
}

function scheduledTimeThisWeek(now = new Date()): Date {
  const day = parseIntEnv(process.env.GOV_WEEKLY_DIGEST_DAY, 0) // Sunday default
  const hour = parseIntEnv(process.env.GOV_WEEKLY_DIGEST_HOUR, 9)
  const minute = parseIntEnv(process.env.GOV_WEEKLY_DIGEST_MINUTE, 0)
  const d = new Date(now)
  const currentDay = d.getDay()
  const diff = day - currentDay
  d.setDate(d.getDate() + diff)
  d.setHours(hour, minute, 0, 0)
  return d
}

function isDue(lastGeneratedAt: string | null, now = new Date()): boolean {
  const schedule = scheduledTimeThisWeek(now)
  if (now.getTime() < schedule.getTime()) return false
  if (!lastGeneratedAt) return true
  const last = new Date(lastGeneratedAt)
  return last.getTime() < schedule.getTime()
}

export async function runWeeklyDigestJob(force = false): Promise<{
  ran: boolean
  digestId: string | null
  reason?: string
}> {
  const lastGeneratedAt = await getLastDigestGeneratedAt()
  if (!force && !isDue(lastGeneratedAt)) {
    return { ran: false, digestId: null, reason: 'Not due yet.' }
  }

  const { weekStart, weekEnd } = weekRange()
  const [crpsExecutions, containmentEvents] = await Promise.all([
    listCrpsExecutions(weekStart, weekEnd),
    listContainmentEvents(weekStart, weekEnd),
  ])

  const snapshot = aggregateWeeklyDigest(crpsExecutions, containmentEvents, weekStart, weekEnd)
  await insertWeeklyDigest(snapshot)

  for (const pattern of snapshot.topPatterns) {
    const row = crpsExecutions.find((entry) => entry.crps_id === pattern.crpsId)
    await upsertWeeklyPattern({
      weekStart,
      crpsId: pattern.crpsId,
      workflowId: row?.workflow_id ?? 'unknown',
      riskDomains: pattern.riskDomains,
      count: pattern.count,
    })
  }

  await appendGovernanceLedgerEvent({
    eventType: 'weekly_digest_published',
    workflowId: 'governance.weekly_digest',
    crpsId: null,
    payload: {
      digestId: snapshot.id,
      weekStart,
      weekEnd,
      topPatterns: snapshot.topPatterns.length,
    },
  })

  return { ran: true, digestId: snapshot.id }
}
