// components/Header.tsx
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function Header() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOutAction() {
    'use server'
    const supa = (await import('@/lib/supabase/server')).createSupabaseServerClient()
    await supa.auth.signOut()
    return (await import('next/navigation')).redirect('/login')
  }

  return (
    <header className="w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          RocketGPT
          <span className="ml-2 text-sm text-gray-500">AI Orchestrator</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!user ? (
            <Link
              href="/login"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Login / Sign up
            </Link>
          ) : (
            <>
              <span className="hidden sm:inline text-sm text-gray-600">
                Welcome, <b>{user.user_metadata?.full_name ?? user.email}</b>
              </span>
              <Link
                href="/account"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Account
              </Link>
              <Link
                href="/account/profile"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Profile
              </Link>
              <form action={signOutAction}>
                <button
                  className="rounded bg-black text-white px-3 py-1.5 text-sm"
                >
                  Logout
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  )
}


