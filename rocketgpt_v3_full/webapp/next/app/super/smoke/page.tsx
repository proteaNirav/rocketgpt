import StatusCard from '@/app/components/StatusCard'
import { getJSON } from '@/app/lib/api'

type Health = {
  ok: boolean
  startedAt: string
  commit: string
  version: string
  services: Record<string, string>
}

async function getHealth() {
  const { ok, data, error } = await getJSON<Health>('/api/health', undefined, 3000)
  return { ok, data, error }
}

async function getLimits() {
  const { ok, data, error } = await getJSON<any>('/api/limits', undefined, 3000)
  return { ok, data, error }
}

export default async function Page() {
  const [health, limits] = await Promise.all([getHealth(), getLimits()])
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">System Smoke</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusCard
          title="Health Endpoint"
          value={health.ok ? 'OK' : 'FAIL'}
          bad={!health.ok}
          hint={health.error ?? ''}
        />
        <StatusCard title="Commit" value={health.data?.commit} hint={health.data?.version} />
        <StatusCard title="Started At" value={health.data?.startedAt} />
        <StatusCard
          title="Limits API"
          value={limits.ok ? 'OK' : 'FAIL'}
          bad={!limits.ok}
          hint={limits.error ?? ''}
        />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(health.data?.services ?? {}).map(([k, v]) => (
          <StatusCard key={k} title={`Svc: ${k}`} value={v} />
        ))}
      </div>
    </div>
  )
}
