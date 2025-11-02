async function getHealth(){
  const res = await fetch('/api/health', { cache: 'no-store' });
  if(!res.ok) return null;
  return res.json();
}

export default async function StatusPage() {
  const data = await getHealth();
  const pill = (ok?: boolean)=> ok? 'bg-green-600' : 'bg-red-600';
  const updated = data ? 'Updated ' + new Date(data.at).toLocaleString() : 'Unable to load live status.';
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">RocketGPT • System Status</h1>
      <p className="text-sm text-gray-400">{updated}</p>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">API</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className={'inline-block w-2 h-2 rounded-full ' + pill(data?.checks?.api?.ok)} />
            <span>{data?.checks?.api?.ok? 'OK' : 'Down'}</span>
            <span className="ml-auto text-xs text-gray-500">{data?.checks?.api?.ms ?? '-'} ms</span>
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Supabase</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className={'inline-block w-2 h-2 rounded-full ' + pill(data?.checks?.supabase?.ok)} />
            <span>{data?.checks?.supabase?.ok? 'OK' : 'Unavailable'}</span>
            <span className="ml-auto text-xs text-gray-500">{data?.checks?.supabase?.ms ?? '-'} ms</span>
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Jobs</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className={'inline-block w-2 h-2 rounded-full ' + pill(data?.checks?.jobs?.ok)} />
            <span>{data?.checks?.jobs?.ok? 'Reachable' : 'Idle/Off'}</span>
            <span className="ml-auto text-xs text-gray-500">{data?.checks?.jobs?.ms ?? '-'} ms</span>
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <h2 className="font-medium">Overall</h2>
          <p className="mt-1 text-sm">{data?.overall ?? 'unknown'}</p>
        </div>
      </section>
      <p className="text-sm text-gray-500">Values are best-effort with short timeouts. Configure env: NEXT_PUBLIC_CORE_API_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
    </main>
  );
}
