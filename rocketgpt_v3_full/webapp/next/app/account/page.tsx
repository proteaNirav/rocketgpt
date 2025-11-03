import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AccountPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <div className="border rounded p-4 space-y-2">
        <div className="font-medium">{profile?.display_name ?? user.email}</div>
        <div className="text-sm text-gray-500">{user.email}</div>
        <div className="text-sm">Role: <b>{profile?.role ?? 'user'}</b> Â· Plan: <b>{profile?.plan ?? 'free'}</b></div>
      </div>

      <form action={signOutAction}>
        <button className="rounded bg-black text-white px-4 py-2">Sign out</button>
      </form>
    </div>
  )
}

async function signOutAction() {
  'use server'
  const supabase = (await import('@/lib/supabase/server')).createSupabaseServerClient()
  await supabase.auth.signOut()
  return (await import('next/navigation')).redirect('/login')
}


