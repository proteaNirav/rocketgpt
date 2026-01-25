import 'server-only';

// Auto-created by RGPT-S4-A2 to satisfy ../supabase/server imports.
// Uses service role key for server-side writes (RLS bypass).
// Ensure SUPABASE_SERVICE_ROLE_KEY is set in server environment.

import { createClient as supabaseCreateClient, type SupabaseClient } from '@supabase/supabase-js';
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

  return supabaseCreateClient(url, key, { auth: { persistSession: false } });
}

