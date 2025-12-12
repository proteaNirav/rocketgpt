'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
}
