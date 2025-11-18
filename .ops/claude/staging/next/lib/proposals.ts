// Simple client helpers to read/update improvement proposals via RLS.
// Superusers can read/update all rows (by policy). Others will see empty/own.
'use client'
import { supabase } from '@/lib/supabaseClient'

export type Proposal = {
  id: string
  created_at: string
  created_by: string | null
  title: string
  hypothesis: string
  rationale: any
  impacted_area: string
  severity: 'low' | 'medium' | 'high'
  confidence: number
  status: 'queued' | 'under_review' | 'approved' | 'rejected' | 'implemented'
  branch_name: string | null
  pr_url: string | null
}

export async function isSuperuser(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return false
  const { data, error } = await supabase
    .from('app_superusers')
    .select('user_id')
    .eq('user_id', uid)
    .limit(1)
  if (error) return false
  return !!data && data.length > 0
}

export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('improvement_proposals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data ?? []) as Proposal[]
}

export async function updateProposal(
  id: string,
  updates: Partial<Proposal>
): Promise<void> {
  const { error } = await supabase
    .from('improvement_proposals')
    .update(updates)
    .eq('id', id)
  if (error) throw new Error(error.message)
}


