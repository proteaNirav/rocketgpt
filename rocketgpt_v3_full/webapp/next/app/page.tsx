'use client';
import { useState } from 'react';
import { RocketGPT } from '@rocketgpt/sdk';
import { WorkflowCard } from '@rocketgpt/ui';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';
const client = new RocketGPT(API_BASE);

export default function Home() {
  const [task, setTask] = useState('Create a 1-page research brief on India IPOs');
  const [persona, setPersona] = useState('professional');
  const [mode, setMode] = useState('/live');
  const [orgPrefs, setOrgPrefs] = useState('ChatGPT,Claude');
  const [out, setOut] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true);
    try {
      const res = await client.orchestrate({ task, persona, mode, org_prefs: orgPrefs.split(',').map(s=>s.trim()) });
      setOut(res);
    } catch (e:any) {
      setOut({ error: e?.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">🚀 RocketGPT — Orchestrator</h1>
        <p className="text-slate-400">Route your goal to the right AI tools with a clear workflow.</p>
      </header>
      <section className="card space-y-3">
        <label className="font-semibold">Task</label>
        <textarea value={task} onChange={e=>setTask(e.target.value)} className="input" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="font-semibold">Persona</label>
            <select value={persona} onChange={e=>setPersona(e.target.value)} className="select">
              <option>beginner</option><option>professional</option><option>expert</option>
            </select>
          </div>
          <div>
            <label className="font-semibold">Mode</label>
            <select value={mode} onChange={e=>setMode(e.target.value)} className="select">
              <option>/fast</option><option>/deep</option><option>/creative</option><option>/organize</option><option>/live</option>
            </select>
          </div>
          <div>
            <label className="font-semibold">Org Prefs (comma separated)</label>
            <input value={orgPrefs} onChange={e=>setOrgPrefs(e.target.value)} className="input" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button onClick={go} className="btn" disabled={loading}>{loading ? 'Running…' : 'Orchestrate'}</button>
          <a href={`${API_BASE}/health`} target="_blank" rel="noreferrer">Health</a>
          <a href={`${API_BASE}/metrics`} target="_blank" rel="noreferrer">Metrics</a>
          <a href={`${API_BASE}/system-prompt`} target="_blank" rel="noreferrer">System Prompt</a>
        </div>
      </section>
      <section className="card mt-4">
        <h3 className="text-lg font-semibold mb-2">Result</h3>
        {out ? (out.error ? <pre>{out.error}</pre> : <WorkflowCard data={out} />) : <pre>Press “Orchestrate”…</pre>}
      </section>
    </main>
  );
}
