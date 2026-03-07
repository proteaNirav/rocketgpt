import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

export type CatsStatus = 'draft' | 'review' | 'approved' | 'active' | 'deprecated' | 'revoked'
export type CatsVersionStatus = 'draft' | 'published' | 'revoked'

export type CatRow = {
  id: string
  tenant_id: string
  owner_user_id: string | null
  name: string
  description: string | null
  status: CatsStatus
  created_at: string
  updated_at: string
}

export type CatVersionRow = {
  id: string
  cat_id: string
  version: string
  manifest_json: Record<string, unknown>
  rulebook_json: Record<string, unknown>
  command_bundle_ref: string | null
  status: CatsVersionStatus
  created_at: string
}

let supabaseAdminClient: SupabaseClient | null = null

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) return supabaseAdminClient
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase server credentials.')
  }
  supabaseAdminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return supabaseAdminClient
}

function isInMemoryEnabled(): boolean {
  return process.env.CATS_INMEMORY === '1'
}

type InMemState = {
  cats: CatRow[]
  versions: CatVersionRow[]
}

function inMemoryFilePath(): string {
  return path.join(process.cwd(), '.next', 'cache', 'cats-inmemory.json')
}

function readState(): InMemState {
  const file = inMemoryFilePath()
  try {
    const raw = fs.readFileSync(file, 'utf8')
    const parsed = JSON.parse(raw)
    return {
      cats: Array.isArray(parsed?.cats) ? parsed.cats : [],
      versions: Array.isArray(parsed?.versions) ? parsed.versions : [],
    }
  } catch {
    return { cats: [], versions: [] }
  }
}

function writeState(next: InMemState): void {
  const file = inMemoryFilePath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(next), 'utf8')
}

function nowIso(): string {
  return new Date().toISOString()
}

function id(): string {
  return crypto.randomUUID()
}

export async function listCats(input: {
  tenantId: string
  page: number
  pageSize: number
}): Promise<{ items: CatRow[]; total: number }> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const rows = state.cats
      .filter((c) => c.tenant_id === input.tenantId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const start = (input.page - 1) * input.pageSize
    return { items: rows.slice(start, start + input.pageSize), total: rows.length }
  }

  const supabase = getSupabaseAdminClient()
  const from = (input.page - 1) * input.pageSize
  const to = from + input.pageSize - 1
  const { data, error, count } = await supabase
    .from('cats')
    .select('*', { count: 'exact' })
    .eq('tenant_id', input.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { items: (data || []) as CatRow[], total: count || 0 }
}

export async function createCat(input: {
  tenantId: string
  ownerUserId: string | null
  name: string
  description: string | null
}): Promise<CatRow> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const dupe = state.cats.find(
      (c) => c.tenant_id === input.tenantId && c.name.toLowerCase() === input.name.toLowerCase(),
    )
    if (dupe) throw new Error('duplicate key value violates unique constraint')
    const row: CatRow = {
      id: id(),
      tenant_id: input.tenantId,
      owner_user_id: input.ownerUserId,
      name: input.name,
      description: input.description,
      status: 'draft',
      created_at: nowIso(),
      updated_at: nowIso(),
    }
    state.cats.push(row)
    writeState(state)
    return row
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('cats')
    .insert({
      tenant_id: input.tenantId,
      owner_user_id: input.ownerUserId,
      name: input.name,
      description: input.description,
      status: 'draft',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as CatRow
}

export async function getCatById(tenantId: string, catId: string): Promise<CatRow | null> {
  if (isInMemoryEnabled()) {
    const state = readState()
    return state.cats.find((c) => c.tenant_id === tenantId && c.id === catId) || null
  }
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('cats')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', catId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as CatRow | null) || null
}

export async function updateCat(input: {
  tenantId: string
  catId: string
  name?: string
  description?: string | null
}): Promise<CatRow | null> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const row =
      state.cats.find((c) => c.tenant_id === input.tenantId && c.id === input.catId) || null
    if (!row) return null
    if (typeof input.name === 'string') row.name = input.name
    if (input.description !== undefined) row.description = input.description
    row.updated_at = nowIso()
    writeState(state)
    return row
  }
  const supabase = getSupabaseAdminClient()
  const patch: Record<string, unknown> = {}
  if (typeof input.name === 'string') patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  const { data, error } = await supabase
    .from('cats')
    .update(patch)
    .eq('tenant_id', input.tenantId)
    .eq('id', input.catId)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as CatRow | null) || null
}

export async function transitionCat(input: {
  tenantId: string
  catId: string
  status: CatsStatus
}): Promise<CatRow | null> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const row =
      state.cats.find((c) => c.tenant_id === input.tenantId && c.id === input.catId) || null
    if (!row) return null
    row.status = input.status
    row.updated_at = nowIso()
    writeState(state)
    return row
  }
  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('cats')
    .update({ status: input.status })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.catId)
    .select('*')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as CatRow | null) || null
}

export async function createPublishedVersion(input: {
  tenantId: string
  catId: string
  version: string
  manifestJson: Record<string, unknown>
  rulebookJson: Record<string, unknown>
  commandBundleRef: string | null
}): Promise<CatVersionRow> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const cat = state.cats.find((c) => c.tenant_id === input.tenantId && c.id === input.catId)
    if (!cat) throw new Error('CAT not found.')
    const dupe = state.versions.find((v) => v.cat_id === input.catId && v.version === input.version)
    if (dupe) throw new Error('duplicate key value violates unique constraint')
    const row: CatVersionRow = {
      id: id(),
      cat_id: input.catId,
      version: input.version,
      manifest_json: input.manifestJson,
      rulebook_json: input.rulebookJson,
      command_bundle_ref: input.commandBundleRef,
      status: 'published',
      created_at: nowIso(),
    }
    state.versions.push(row)
    writeState(state)
    return row
  }

  const supabase = getSupabaseAdminClient()
  const { data, error } = await supabase
    .from('cats_versions')
    .insert({
      cat_id: input.catId,
      version: input.version,
      manifest_json: input.manifestJson,
      rulebook_json: input.rulebookJson,
      command_bundle_ref: input.commandBundleRef,
      status: 'published',
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as CatVersionRow
}

export async function listVersions(tenantId: string, catId: string): Promise<CatVersionRow[]> {
  if (isInMemoryEnabled()) {
    const state = readState()
    const cat = state.cats.find((c) => c.tenant_id === tenantId && c.id === catId)
    if (!cat) return []
    return state.versions
      .filter((v) => v.cat_id === catId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const supabase = getSupabaseAdminClient()
  const cat = await getCatById(tenantId, catId)
  if (!cat) return []
  const { data, error } = await supabase
    .from('cats_versions')
    .select('*')
    .eq('cat_id', catId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as CatVersionRow[]
}
