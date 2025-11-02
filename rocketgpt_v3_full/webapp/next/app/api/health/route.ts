import { NextResponse } from 'next/server'

async function timedFetch(url: string, init: RequestInit = {}, timeoutMs = 4000) {
  const start = Date.now();
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' as any });
    const ms = Date.now() - start;
    return { ok: res.ok, status: res.status, ms };
  } catch (e:any) {
    const ms = Date.now() - start;
    return { ok: false, status: 0, ms, error: e?.name || 'error' };
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_CORE_API_URL || 'https://rocketgpt-core-api.onrender.com';
  const sbUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const checks: Record<string, any> = {};

  checks.api = await timedFetch(apiUrl + '/health');
  if (!checks.api.ok) {
    checks.api = await timedFetch(apiUrl);
  }

  if (sbUrl) {
    checks.supabase = await timedFetch(sbUrl + '/rest/v1/', { method: 'HEAD', headers: { 'apikey': sbAnon || 'anon' }});
  } else {
    checks.supabase = { ok: false, status: 0, ms: 0, error: 'unset_env_NEXT_PUBLIC_SUPABASE_URL' };
  }

  const fnBase = sbUrl ? (sbUrl.replace('.supabase.co','') + '.functions.supabase.co') : '';
  if (fnBase && sbAnon) {
    checks.jobs = await timedFetch(fnBase + '/quick-responder', { headers: { 'Authorization': 'Bearer ' + sbAnon, 'apikey': sbAnon } });
  } else {
    checks.jobs = { ok: false, status: 0, ms: 0, error: 'no_functions_or_key' };
  }

  const overall = [checks.api, checks.supabase].every((x:any) => x && x.ok) ? 'ok' : 'degraded';
  return NextResponse.json({ overall, at: new Date().toISOString(), checks });
}
