'use client';

import { useEffect, useMemo, useState } from 'react';

type Mode = '/fast' | '/deep' | '/organize' | '/creative' | '/live';
type Persona = 'beginner' | 'professional' | 'expert';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

type Tool = {
  name: string;
  purpose?: string;
  pricing?: string;
  access_url?: string;
  workflow_role?: 'primary' | 'supporting';
  latency_ms_est?: number;
};

type Plan = {
  understood: string;
  tools: Tool[];
  workflow: string[];
  summary: string;
};

type PlanAndGenerateResponse = {
  plan: Plan;
  provider: string;
  model: string;
  quality: string;
  output: string;
};

function useHealth(base: string) {
  const [status, setStatus] = useState<'checking' | 'ok' | 'down'>('checking');
  const [detail, setDetail] = useState<string>('');
  const check = async () => {
    try {
      const r = await fetch(`${base}/health`, { cache: 'no-store' });
      if (r.ok) {
        setStatus('ok'); setDetail('');
      } else {
        setStatus('down'); setDetail(`HTTP ${r.status}`);
      }
    } catch (e: any) {
      setStatus('down'); setDetail(e?.message ?? 'Network error');
    }
  };
  useEffect(() => {
    if (!base) { setStatus('down'); setDetail('API base not set'); return; }
    check(); const id = setInterval(check, 15000); return () => clearInterval(id);
  }, [base]);
  return { status, detail, refresh: check };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 border shadow-sm">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function ToolCard({ t }: { t: Tool }) {
  return (
    <div className="border rounded-xl p-3 hover:shadow-sm transition">
      <div className="flex items-center justify-between">
        <div className="font-medium">{t.name}</div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
          t.workflow_role === 'primary'
            ? 'bg-black text-white border-black'
            : 'bg-gray-50 text-gray-700 border-gray-200'
        }`}>
          {t.workflow_role || 'supporting'}
        </span>
      </div>
      <div className="mt-1 text-xs text-gray-600">{t.purpose || '—'}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-gray-600">
        <div><span className="text-gray-500">Pricing:</span> {t.pricing || '—'}</div>
        <div><span className="text-gray-500">Latency:</span> {t.latency_ms_est ? `${t.latency_ms_est} ms` : '—'}</div>
        <div className="truncate">
          <span className="text-gray-500">URL:</span>{' '}
          {t.access_url ? <a className="underline" href={t.access_url} target="_blank">link</a> : '—'}
        </div>
      </div>
    </div>
  );
}

// Super-light formatting for the final output (no extra packages)
function RenderOutput({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bullets = lines.every(l => l.startsWith('- ') || l.startsWith('• ') || l.match(/^\d+\./));
  if (bullets) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.map((l, i) => (
          <li key={i} className="text-sm leading-relaxed">
            {l.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>;
}

export default function HomePage() {
  const [task, setTask] = useState<string>('Design a GTM plan for an AI startup');
  const [mode, setMode] = useState<Mode>('/organize');
  const [persona, setPersona] = useState<Persona>('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [data, setData] = useState<PlanAndGenerateResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const { status, detail, refresh } = useHealth(API_BASE);
  const badge = useMemo(() => {
    if (status === 'checking') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (status === 'ok') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-red-100 text-red-800 border-red-200';
  }, [status]);

  const run = async () => {
    setLoading(true); setError(''); setShowRaw(false); setData(null);
    try {
      const r = await fetch(`${API_BASE}/plan-and-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, mode, persona, org_prefs: [] }),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.detail || 'Request failed');
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const openInNew = (path: string) => window.open(`${API_BASE}${path}`, '_blank', 'noopener,noreferrer');

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-black text-white grid place-items-center font-bold">R</div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">RocketGPT — Orchestrator</h1>
              <p className="text-xs text-gray-500">Plan + AutoPilot (Groq) generation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs border rounded-full ${badge}`}>
              {status === 'checking' ? 'Checking…' : status === 'ok' ? 'API: OK' : 'API: Down'}
            </span>
            <button onClick={refresh} className="text-xs px-3 py-1 rounded-md border bg-white hover:bg-gray-50">
              Recheck
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Input */}
        <Section title="Task">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <textarea
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want to achieve…"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Persona</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={persona}
                      onChange={(e) => setPersona(e.target.value as Persona)}>
                <option value="beginner">beginner</option>
                <option value="professional">professional</option>
                <option value="expert">expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Mode</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={mode}
                      onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="/fast">/fast</option>
                <option value="/deep">/deep</option>
                <option value="/organize">/organize</option>
                <option value="/creative">/creative</option>
                <option value="/live">/live</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={run}
                disabled={loading || status !== 'ok'}
                className="w-full py-2 rounded-lg bg-black text-white text-sm hover:bg-black/90 disabled:opacity-50"
              >
                {loading ? 'Running…' : 'Plan & Generate'}
              </button>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
        </Section>

        {/* Result */}
        <Section title="Result">
          {!data && <p className="text-sm text-gray-500">Run a task to see the output here.</p>}

          {data && (
            <div className="space-y-5">
              {/* Plan summary */}
              <div className="text-sm text-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 text-xs border rounded-full bg-gray-50">provider: {data.provider}</span>
                  <span className="px-2 py-0.5 text-xs border rounded-full bg-gray-50">model: {data.model}</span>
                  <span className="px-2 py-0.5 text-xs border rounded-full bg-gray-50">quality: {data.quality}</span>
                </div>
                <p className="mt-2 text-gray-600">{data.plan.summary}</p>
              </div>

              {/* Tool cards */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Selected Tools</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {data.plan.tools.map((t, i) => <ToolCard key={i} t={t} />)}
                </div>
              </div>

              {/* Workflow */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Workflow</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  {data.plan.workflow.map((step, i) => (
                    <li key={i} className="text-sm leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>

              {/* Final output */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Final Answer</h3>
                <div className="border rounded-xl p-3 bg-gray-50">
                  <RenderOutput text={data.output} />
                </div>
              </div>

              {/* Raw JSON toggle */}
              <div>
                <button
                  className="text-xs underline"
                  onClick={() => setShowRaw(!showRaw)}
                >
                  {showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
                </button>
                {showRaw && (
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-white border rounded-lg p-3 overflow-x-auto">
{JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </Section>

        {/* Utilities */}
        <Section title="Utilities">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openInNew('/health')} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm">Health</button>
            <button onClick={() => openInNew('/metrics')} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm">Metrics</button>
            <button onClick={() => openInNew('/system-prompt')} className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm">System Prompt</button>
          </div>
          <p className="mt-3 text-[11px] text-gray-500">API Base: <code className="text-gray-700">{API_BASE || 'NOT SET'}</code></p>
        </Section>
      </section>

      <footer className="py-6 border-t bg-white">
        <div className="max-w-6xl mx-auto px-4 text-xs text-gray-500">
          © {new Date().getFullYear()} RocketGPT · v3.0
        </div>
      </footer>
    </main>
  );
}
