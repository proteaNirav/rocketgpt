// webapp/next/app/debug-auth/page.tsx
import { cookies } from 'next/headers'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import DebugAuthClient from '@/components/DebugAuthClient'

export const dynamic = 'force-dynamic'

export default async function DebugAuthPage() {
  const cookieStore = await cookies()
  const guestId = cookieStore.get('guest_id')?.value ?? null

  const sb = await getSupabaseServerClient()
  const { data } = await sb.auth.getUser()
  const userId = data.user?.id ?? null

  const computedUid = userId ?? guestId ?? 'guest'

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-xl font-semibold">/debug-auth</h1>

      <div className="rounded-lg border bg-neutral-900 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Supabase user.id</div>
            <div className="font-mono break-all">{userId ?? 'null'}</div>
          </div>
          <div>
            <div className="text-gray-400">guest_id cookie</div>
            <div className="font-mono break-all">{guestId ?? 'null'}</div>
          </div>
          <div>
            <div className="text-gray-400">Computed x-user-id</div>
            <div className="font-mono break-all">{computedUid}</div>
          </div>
          <div>
            <div className="text-gray-400">NEXT_PUBLIC_SUPABASE_URL</div>
            <div className="font-mono break-all">
              {process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'}
            </div>
          </div>
        </div>
      </div>

      <DebugAuthClient computedUid={computedUid} />
    </main>
  )
}
