'use client';

import { useEffect, useMemo, useState } from 'react';

type Mode = '/fast' | '/deep' | '/organize' | '/creative' | '/live';
type Persona = 'beginner' | 'professional' | 'expert';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

function useHealth(base: string) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  const [detail, setDetail] = useState<string>('');

  const check = async () => {
    try {
      const r = await fetch(`${base}/health`, { cache: 'no-store' });
      if (r.ok) {
        setStatus('ok');
        setDetail('');
      } else {
        setStatus('down');
        setDetail(`HTTP ${r.status}`);
      }
    } catch (e: any) {
      setStatus('down');
      setDetail(e?.message ?? 'Network error');
    }
  };

  useEffect(() => {
    if (!base) { setStatus('down'); setDetail('API base not set'); return; }
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  return { status, detail, refresh: check };
}

export default function HomePage() {
  const [task, setTask] = useState<string>('Draft a 3-step GTM plan for a freemium AI tool');
  const [mode, setMode] = useState<Mode>('/organize');
  const [persona, setPersona] = useState<Persona>('professional');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const { status, detail, refresh } = useHealth(API_BASE);

  const badge = useMemo(() => {
    if (status === 'checking') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (status === 'ok') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-red-100 text-red-800 border-red-200';
  }, [status]);

  const callPlanAndGenerate = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await fetch(`${API_BASE}/plan-and-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, mode, persona, org_prefs: [] }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.detail || 'Request failed');
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const openInNew = (path: string) => {
    window.open(`${API_BASE}${path}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-black text-white grid place-items-center font-bold">R</div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">RocketGPT Console</h1>
              <p className="text-xs text-gray-500">AI Orchestrator · v3.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs border rounded-full ${badge}`}>
              {status === 'checking' ? 'Checking…' : status === 'ok' ? 'API: OK' : 'API: Down'}
            </span>
            <button
              onClick={refresh}
              className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-gray-50"
            >
              Recheck
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-4 border shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-2">Task</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                rows={4}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want to achieve…"
              />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Mode</label>
                  <select
                    className="w-full border rounded-lg p-2 text-sm"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
                  >
                    <option value="/fast">/fast</option>
                    <option value="/deep">/deep</option>
                    <option value="/organize">/organize</option>
                    <option value="/creative">/creative</option>
                    <option value="/live">/live</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Persona</label>
                  <select
                    className="w-full border rounded-lg p-2 text-sm"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value as Persona)}
                  >
                    <option value="beginner">beginner</option>
                    <option value="professional">professional</option>
                    <option value="expert">expert</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={callPlanAndGenerate}
                    disabled={loading || status !== 'ok'}
                    className="w-full py-2 rounded-lg bg-black text-white text-sm hover:bg-black/90 disabled:opacity-50"
                  >
                    {loading ? 'Running…' : 'Plan & Generate'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm">
              <h2 className="text-sm font-semibold mb-2">Result</h2>
              {!result && <p className="text-sm text-gray-500">Run a task to see the output here.</p>}
              {result && (
                <pre className="text-xs whitespace-pre-wrap bg-gray-50 border rounded-lg p-3 overflow-x-auto">
{JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Utilities</h3>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => openInNew('/health')}
                  className="w-full py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                >
                  Health
                </button>
                <button
                  onClick={() => openInNew('/metrics')}
                  className="w-full py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                >
                  Metrics
                </button>
                <button
                  onClick={() => openInNew('/system-prompt')}
                  className="w-full py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                >
                  System Prompt
                </button>
                <button
                  onClick={() => window.open('https://rocketgpt.dev', '_blank')}
                  className="w-full py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                >
                  Landing
                </button>
              </div>
              <p className="mt-3 text-[11px] text-gray-500">
                API Base: <code className="text-gray-700">{API_BASE || 'NOT SET'}</code>
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 border shadow-sm">
              <h3 className="text-sm font-semibold mb-2">About</h3>
              <p className="text-sm text-gray-600">
                RocketGPT orchestrates the best AI tools for your goal using modes, persona, and an internal ToolBase.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="py-6 border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 text-xs text-gray-500">
          © {new Date().getFullYear()} RocketGPT · v3.0
        </div>
      </footer>
    </main>
  );
}
